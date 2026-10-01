const { answerInventoryQuery } = require('../services/assistantService');

exports.askAssistant = async (req, res, next) => {
  try {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid question.'
      });
    }

    const response = await answerInventoryQuery(question);

    res.json({
      success: true,
      question: question.trim(),
      ...response
    });
  } catch (err) {
    next(err);
  }
};
