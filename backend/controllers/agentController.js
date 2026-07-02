const mongoose = require('mongoose');
const Agent = require('../models/Agent');

/**
 * @desc    Get all agents for the authenticated user
 * @route   GET /api/agents
 * @access  Private
 */
const getAgents = async (req, res) => {
  try {
    const agents = await Agent.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: agents.length,
      agents
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
};

/**
 * @desc    Create a new agent
 * @route   POST /api/agents
 * @access  Private
 */
const createAgent = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide an agent name' 
      });
    }

    const agent = await Agent.create({
      userId: req.user.id,
      name,
      description: description || '',
      connectionId: new mongoose.Types.ObjectId(), // Default placeholder for now
      modelId: 'gpt-4o', // Default placeholder
      instructions: "You are a helpful AI assistant.",
      tools: [],
      knowledge: []
    });

    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      agent
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
};

/**
 * @desc    Delete an agent
 * @route   DELETE /api/agents/:id
 * @access  Private
 */
const deleteAgent = async (req, res) => {
  try {
    const agent = await Agent.findOne({ _id: req.params.id, userId: req.user.id });

    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    await agent.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
};

/**
 * @desc    Update an agent
 * @route   PUT /api/agents/:id
 * @access  Private
 */
const updateAgent = async (req, res) => {
  try {
    const { name, description, connectionId, modelId, instructions, tools, knowledge } = req.body;

    let agent = await Agent.findOne({ _id: req.params.id, userId: req.user.id });

    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    if (name !== undefined) agent.name = name;
    if (description !== undefined) agent.description = description;
    if (connectionId !== undefined) agent.connectionId = connectionId;
    if (modelId !== undefined) agent.modelId = modelId;
    if (instructions !== undefined) agent.instructions = instructions;
    if (tools !== undefined) agent.tools = tools;
    if (knowledge !== undefined) agent.knowledge = knowledge;

    await agent.save();

    res.status(200).json({
      success: true,
      message: 'Agent updated successfully',
      agent
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
};

module.exports = {
  getAgents,
  createAgent,
  deleteAgent,
  updateAgent
};
