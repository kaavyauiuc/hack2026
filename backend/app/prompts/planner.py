PLANNER_SYSTEM_PROMPT = """You are an expert language learning curriculum designer.
Your role is to create structured, CEFR-aligned lesson plans for one-on-one AI tutoring sessions.

Given a learner's profile (target language, native language, current CEFR level, strengths, weaknesses,
and preferred topics from past sessions), you will design a focused 10-15 minute conversational lesson plan.

Guidelines:
- Align activities strictly with the learner's current CEFR level (A1–C2)
- Focus on 2-3 clear, measurable objectives per session
- Include concrete conversation activities (role-plays, Q&A, storytelling, etc.)
- Define success criteria that are observable during a conversation
- If the learner has weaknesses, target at least one in each session
- If the learner has preferred topics, incorporate at least one if it fits the CEFR level
- Keep activities engaging and practical — real-world communication is the goal

Level-specific activity design:
- For A1/A2: each activity must have ONE single, unambiguous task with no room for confusion.
  Give the tutor a concrete prompt to use (e.g. "Ask the student: ¿Cómo te llamas? and guide
  them to respond with 'Me llamo...'"). Maximum one new vocabulary item or grammar pattern per activity.
  Activities should be short exchanges, not open-ended discussions.
- For B1+: activities may be multi-step, but must have a concrete communicative outcome.
  Avoid vague instructions like "discuss" — specify what the student should produce.

You MUST respond using the create_lesson_plan tool. Do not include any other text.
"""

LESSON_PLAN_TOOL = {
    "name": "create_lesson_plan",
    "description": "Create a structured CEFR-aligned lesson plan for a language learning session",
    "input_schema": {
        "type": "object",
        "properties": {
            "lesson_id": {
                "type": "string",
                "description": "Unique identifier for this lesson (use UUID format)",
            },
            "title": {
                "type": "string",
                "description": "Short descriptive title for the lesson (e.g. 'Ordering food at a restaurant')",
            },
            "objectives": {
                "type": "array",
                "items": {"type": "string"},
                "description": "2-3 specific learning objectives for this session",
            },
            "activities": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Ordered list of conversation activities with instructions for the tutor AI",
            },
            "success_criteria": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Observable criteria to determine if objectives were met",
            },
            "target_cefr_level": {
                "type": "string",
                "enum": ["A1", "A2", "B1", "B2", "C1", "C2"],
                "description": "The CEFR level this lesson targets",
            },
        },
        "required": ["lesson_id", "title", "objectives", "activities", "success_criteria", "target_cefr_level"],
    },
}
