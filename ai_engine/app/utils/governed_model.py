from typing import Any, List, Optional, Iterator, AsyncIterator, Sequence, Union, Callable
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, AIMessage
from langchain_core.outputs import ChatResult, ChatGenerationChunk
from langchain_core.callbacks import CallbackManagerForLLMRun, AsyncCallbackManagerForLLMRun
from langchain_core.runnables import Runnable
from langchain_core.language_models.base import LanguageModelInput
from langchain_core.tools import BaseTool
from app.utils.api_governor import APIGovernor

class GovernedChatModel(BaseChatModel):
    inner_model: Any

    def _get_api_key(self) -> str:
        # Dynamically retrieve API key from the inner model if present
        for attr in ["api_key", "openai_api_key", "google_api_key"]:
            if hasattr(self.inner_model, attr):
                val = getattr(self.inner_model, attr)
                if val:
                    # In langchain, API keys can sometimes be SecretStr
                    if hasattr(val, "get_secret_value"):
                        return val.get_secret_value()
                    return str(val)
        return "default"

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        api_key = self._get_api_key()
        APIGovernor.get_instance().acquire_permission(api_key)
        return self.inner_model._generate(messages, stop=stop, run_manager=run_manager, **kwargs)

    async def _agenerate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[AsyncCallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        api_key = self._get_api_key()
        await APIGovernor.get_instance().acquire_permission_async(api_key)
        return await self.inner_model._agenerate(messages, stop=stop, run_manager=run_manager, **kwargs)

    def _stream(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> Iterator[ChatGenerationChunk]:
        api_key = self._get_api_key()
        APIGovernor.get_instance().acquire_permission(api_key)
        return self.inner_model._stream(messages, stop=stop, run_manager=run_manager, **kwargs)

    async def _astream(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[AsyncCallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> AsyncIterator[ChatGenerationChunk]:
        api_key = self._get_api_key()
        await APIGovernor.get_instance().acquire_permission_async(api_key)
        async for chunk in self.inner_model._astream(messages, stop=stop, run_manager=run_manager, **kwargs):
            yield chunk

    @property
    def _llm_type(self) -> str:
        inner_type = getattr(self.inner_model, "_llm_type", "chat_model")
        return f"governed_{inner_type}"

    def bind_tools(
        self,
        tools: Sequence[Union[dict, type, Callable, BaseTool]],
        **kwargs: Any,
    ) -> Runnable[LanguageModelInput, AIMessage]:
        if hasattr(self.inner_model, "bind_tools"):
            bound_model = self.inner_model.bind_tools(tools, **kwargs)
            # Re-wrap the RunnableBinding/ChatModelBinding so it points back to this GovernedChatModel
            from langchain_core.runnables import RunnableBinding
            if isinstance(bound_model, RunnableBinding):
                return bound_model.__class__(
                    bound=self,
                    kwargs=bound_model.kwargs,
                    config=bound_model.config,
                    custom_ops=getattr(bound_model, "custom_ops", None)
                )
            return bound_model
        return super().bind_tools(tools, **kwargs)
