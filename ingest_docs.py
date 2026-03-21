import os
import sys
from google import genai
from google.genai import types

# ==========================================================
# STEP 1: CONNECT THE BRAIN
# We use the same API key you successfully tested earlier
# ==========================================================
api_key = "AIzaSyDFfnfD1cr7HTqY_qzeVqewZbGIpbCbGw4"

# Initialize the Gemini Client
try:
    client = genai.Client(api_key=api_key.strip())
except Exception as e:
    print(f"❌ Error connecting to Gemini: {e}")
    sys.exit(1)

# ==========================================================
# STEP 2: THE AGENT'S SKILLS (Tools)
# In an agentic approach, the AI "chooses" when to use these
# ==========================================================

def search_datahub_docs(query: str):
    """
    Searches the 3,119 chunks of DataHub documentation you processed.
    In a production app, this would query a Vector Database.
    """
    # For this development phase, we simulate the retrieval of facts
    # based on the 331 files you successfully read.
    return (
        f"Context found for '{query}': DataHub uses YAML-based ingestion recipes. "
        "Sources (like Snowflake) require a configuration block with credentials, "
        "and sinks (like DataHub REST) require the GMS endpoint URL."
    )

def validate_yaml_recipe(yaml_content: str):
    """
    A tool that allows the Agent to check its own code for errors.
    """
    if "source:" in yaml_content and "sink:" in yaml_content:
        return "✅ Validation Passed: Recipe contains required source and sink blocks."
    return "❌ Validation Failed: The recipe is missing mandatory 'source' or 'sink' definitions."

# ==========================================================
# STEP 3: THE AGENT'S LOGIC (System Instructions)
# This defines the "Information Experience" behavior
# ==========================================================

system_instruction = """
You are the 'DataHub Specialist Agent'. Your goal is to help users with metadata management.

WORKFLOW:
1. Always call 'search_datahub_docs' first to get technical facts from the manual.
2. If the user needs an ingestion setup, generate the YAML configuration (recipe).
3. Once you write YAML, you MUST call 'validate_yaml_recipe' to double-check it.
4. If the validator finds an error, fix the YAML before showing it to the user.
5. Be concise and provide a step-by-step explanation.
"""

# ==========================================================
# STEP 4: STARTING THE CONVERSATION
# ==========================================================

def chat_with_datahub(user_question):
    print(f"\n[User]: {user_question}")
    print("🤖 Agent is reasoning and searching your 3,119 chunks...")
    
    try:
        # 'automatic_function_calling' makes this truly agentic
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=user_question,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                tools=[search_datahub_docs, validate_yaml_recipe],
                automatic_function_calling=types.AutomaticFunctionCallingConfig(max_remote_calls=5)
            )
        )
        
        print("\n[DataHub Agent Response]:")
        print("-" * 40)
        print(response.text)
        print("-" * 40)

    except Exception as e:
        print(f"❌ An error occurred during the session: {e}")

if __name__ == "__main__":
    # Test Question: Ingesting Snowflake
    chat_with_datahub("How do I connect Snowflake to DataHub? Give me a recipe.")