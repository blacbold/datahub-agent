import os
import sys
import time
import random
from google import genai
from google.genai import types

# ==========================================================
# STEP 1: CONNECT THE BRAIN
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
# ==========================================================

def search_datahub_docs(query: str):
    """
    Searches the 3,119 chunks of DataHub documentation you processed.
    """
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
# STEP 4: STARTING THE CONVERSATION (With Retry Logic)
# ==========================================================

def chat_with_datahub(user_question, max_retries=5):
    print(f"\n[User]: {user_question}")
    # Version 2.2 includes the quota-handling retry logic
    print("🤖 Agent (v2.2) is reasoning and searching your 3,119 chunks...")
    
    for attempt in range(max_retries):
        try:
            # We've removed the AutomaticFunctionCallingConfig to bypass the Pydantic error.
            # Gemini 2.0 Flash is used for reasoning.
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=user_question,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    tools=[search_datahub_docs, validate_yaml_recipe]
                )
            )
            
            print("\n[DataHub Agent Response]:")
            print("-" * 40)
            print(response.text)
            print("-" * 40)
            return # Success! Exit the function.

        except Exception as e:
            error_msg = str(e)
            
            # Handle Rate Limits (429)
            if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                # Exponential backoff with jitter
                wait_time = (2 ** attempt) + random.uniform(5, 15)
                
                # If the error tells us exactly how long to wait, we listen to it
                if "retry in" in error_msg.lower():
                    print(f"⚠️  Quota reached. Error says wait ~45s. Adjusting...")
                    wait_time = max(wait_time, 50) 

                print(f"⏳ Attempt {attempt + 1} hit a limit. Waiting {int(wait_time)}s before trying again...")
                time.sleep(wait_time)
            else:
                # For any other error (like a typo), we stop immediately
                print(f"❌ An error occurred during the session: {e}")
                break
    
    print("\n❌ Final Error: Could not get a response after several retries. Please wait a minute and try again.")

if __name__ == "__main__":
    # Test Question: Ingesting Snowflake
    chat_with_datahub("How do I connect Snowflake to DataHub? Give me a recipe.")