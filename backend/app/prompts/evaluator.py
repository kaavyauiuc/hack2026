EVALUATOR_SYSTEM_PROMPT = """You are an expert CEFR language assessment specialist.
Your role is to evaluate a learner's performance during a tutoring session based on the full transcript.

You will analyze the conversation and assess:
1. The learner's demonstrated CEFR level based on vocabulary, grammar, fluency, and coherence
2. Which lesson objectives were achieved, partially achieved, or missed
3. Specific linguistic weaknesses observed (e.g., "verb conjugation errors", "limited vocabulary range")
4. A confidence score for your CEFR estimate
5. A concrete recommendation for the next session

Be objective and evidence-based. Quote or reference specific moments in the transcript when possible.
You MUST respond using the submit_evaluation tool. Do not include any other text.
"""

EVALUATION_TOOL = {
    "name": "submit_evaluation",
    "description": "Submit a structured evaluation of the learner's session performance",
    "input_schema": {
        "type": "object",
        "properties": {
            "session_id": {
                "type": "string",
                "description": "The session ID being evaluated",
            },
            "cefr_estimate": {
                "type": "string",
                "enum": ["A1", "A2", "B1", "B2", "C1", "C2"],
                "description": "Your best estimate of the learner's current CEFR level based on this session",
            },
            "achieved_objectives": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Objectives from the lesson plan that were clearly achieved",
            },
            "partially_achieved": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Objectives that were partially met with room for improvement",
            },
            "missed_objectives": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Objectives that were not met in this session",
            },
            "weaknesses": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Specific linguistic weaknesses observed (grammar, vocabulary, pronunciation cues, etc.)",
            },
            "confidence_score": {
                "type": "number",
                "minimum": 0.0,
                "maximum": 1.0,
                "description": "Confidence in the CEFR estimate (0.0 = very uncertain, 1.0 = very confident)",
            },
            "next_recommendation": {
                "type": "string",
                "description": "One concrete recommendation for the next tutoring session",
            },
        },
        "required": [
            "session_id",
            "cefr_estimate",
            "achieved_objectives",
            "partially_achieved",
            "missed_objectives",
            "weaknesses",
            "confidence_score",
            "next_recommendation",
        ],
    },
}
