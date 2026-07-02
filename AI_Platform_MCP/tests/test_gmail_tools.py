import os
import sys
import asyncio
import time

# Ensure parent and current directory are in sys.path for package and local module resolution
current_dir = os.path.dirname(os.path.abspath(__file__))
server_dir = os.path.dirname(current_dir)
parent_dir = os.path.dirname(server_dir)

if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
if server_dir not in sys.path:
    sys.path.insert(0, server_dir)

import AI_Platform_MCP.tools.google.mail as google_mail

gmail_send_email = google_mail.gmail_send_email
gmail_find_emails = google_mail.gmail_find_emails
gmail_read_emails = google_mail.gmail_read_emails
gmail_list_labels = google_mail.gmail_list_labels
gmail_create_label = google_mail.gmail_create_label
gmail_modify_email_labels = google_mail.gmail_modify_email_labels
gmail_create_draft = google_mail.gmail_create_draft

# Mock classes to simulate FastMCP request context containing the token
class MockMeta:
    def __init__(self, data):
        self._data = data

    def model_dump(self):
        return self._data

class MockRequestContext:
    def __init__(self, meta_data):
        self.meta = MockMeta(meta_data)

class MockContext:
    def __init__(self, meta_data):
        self.request_context = MockRequestContext(meta_data)

# Test OAuth token loaded from environment
OAUTH_TOKEN = os.environ.get("GOOGLE_OAUTH_TOKEN", "ya29.mock_token_for_testing")
ctx = MockContext({"x-google-oauth-token": OAUTH_TOKEN})

async def run_tests():
    print("--- STARTING GMAIL MCP TOOLS INTEGRATION TESTS ---")
    
    # 1. Test gmail_list_labels
    print("\n1. Testing gmail_list_labels...")
    try:
        res = await gmail_list_labels(ctx=ctx)
        print("Success:", res)
    except Exception as e:
        print("Failed:", str(e))

    # 2. Test gmail_create_label
    test_label_name = f"MCP_Test_{int(time.time())}"
    print(f"\n2. Testing gmail_create_label (Label name: {test_label_name})...")
    try:
        res = await gmail_create_label(label_name=test_label_name, ctx=ctx)
        print("Success:", res)
    except Exception as e:
        print("Failed:", str(e))

    # 3. Test gmail_send_email
    print("\n3. Testing gmail_send_email...")
    try:
        res = await gmail_send_email(
            to="j.keivnbose2005@gmail.com",
            subject="MCP Test Email",
            body="Hello from the MCP integration test suite!",
            ctx=ctx
        )
        print("Success:", res)
    except Exception as e:
        print("Failed:", str(e))

    # 4. Test gmail_create_draft
    print("\n4. Testing gmail_create_draft...")
    try:
        res = await gmail_create_draft(
            to="j.keivnbose2005@gmail.com",
            subject="MCP Draft Test",
            body="This is a test draft email created by MCP.",
            ctx=ctx
        )
        print("Success:", res)
    except Exception as e:
        print("Failed:", str(e))

    # 5. Test gmail_find_emails
    print("\n5. Testing gmail_find_emails (Searching for 'MCP Test')...")
    try:
        res = await gmail_find_emails(query="MCP Test", max_results=5, ctx=ctx)
        print("Success:", res)
        messages = res.get("messages", [])
    except Exception as e:
        print("Failed:", str(e))
        messages = []

    # 6. Test gmail_read_emails
    if messages:
        target_msg_id = messages[0]["id"]
        print(f"\n6. Testing gmail_read_emails (Reading message ID: {target_msg_id})...")
        try:
            res = await gmail_read_emails(message_id=target_msg_id, ctx=ctx)
            print("Success:", res)
        except Exception as e:
            print("Failed:", str(e))
    else:
        print("\n6. Skipping gmail_read_emails (No messages found in search results to read).")

    # 7. Test gmail_modify_email_labels
    if messages:
        target_msg_id = messages[0]["id"]
        print(f"\n7. Testing gmail_modify_email_labels (Adding INBOX, removing UNREAD on ID: {target_msg_id})...")
        try:
            res = await gmail_modify_email_labels(
                message_id=target_msg_id,
                add_labels=["INBOX"],
                remove_labels=["UNREAD"],
                ctx=ctx
            )
            print("Success:", res)
        except Exception as e:
            print("Failed:", str(e))
    else:
        print("\n7. Skipping gmail_modify_email_labels (No messages found to modify).")

    print("\n--- GMAIL MCP TOOLS INTEGRATION TESTS FINISHED ---")

if __name__ == "__main__":
    asyncio.run(run_tests())
