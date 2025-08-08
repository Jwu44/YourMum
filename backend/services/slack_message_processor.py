"""
Slack Message Processor Module
AI-powered message filtering and task generation for Slack messages
"""

import json
import re
from typing import Dict, Any, Tuple, Optional
import anthropic
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class SlackMessageProcessor:
    """AI-powered message filtering and task generation"""
    
    def __init__(self, anthropic_client: Optional[anthropic.Anthropic] = None):
        """
        Initialize SlackMessageProcessor
        
        Args:
            anthropic_client: Optional custom Anthropic client instance
        """
        if anthropic_client:
            self.client = anthropic_client
        else:
            api_key = os.environ.get("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY environment variable required")
            self.client = anthropic.Anthropic(api_key=api_key)
    
    async def process_mention(self, message_data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Analyze message with Claude Haiku to determine if it's actionable
        
        Args:
            message_data: Slack message data with context
            
        Returns:
            Tuple of (is_actionable: bool, task_text: str)
        """
        try:
            # Build analysis prompt
            prompt = self._build_analysis_prompt(message_data)
            
            # Call Claude Haiku for analysis
            response = await self._call_anthropic(prompt)
            
            # Parse AI response
            is_actionable, task_text = self._parse_ai_response(response)
            
            return is_actionable, task_text
            
        except Exception as e:
            print(f"Error processing Slack mention: {str(e)}")
            return False, ""
    
    def _build_analysis_prompt(self, message_data: Dict[str, Any]) -> str:
        """
        Build analysis prompt for AI processing
        
        Args:
            message_data: Slack message data
            
        Returns:
            Formatted prompt string
        """
        text = message_data.get('text', '')
        channel_name = message_data.get('channel_name', 'Unknown Channel')
        sender_name = message_data.get('user_name', 'Unknown User')
        workspace_name = message_data.get('team_name', 'Unknown Workspace')
        
        # Extract mention context
        context = self._extract_mention_context(message_data)
        
        prompt = f"""Analyze this Slack message and determine if it contains an actionable task for the mentioned user.

Message: "{text}"
Context: 
- Channel: #{channel_name}
- Sender: {sender_name}
- Workspace: {workspace_name}
- Thread: {'Yes' if message_data.get('thread_ts') else 'No'}

Rules for determining actionability:
1. Return true only if there's a clear action item for the mentioned user
2. Tasks should be specific and actionable (not just questions or greetings)
3. Extract a concise, actionable task description (remove mentions and conversational fluff)
4. Ignore pure greetings, thank you messages, or FYI notifications
5. Questions that require action/response ARE actionable
6. Requests for help, review, or feedback ARE actionable

Examples of actionable messages:
- "Can you please review the quarterly report by Friday?" → "Review quarterly report by Friday"
- "Could you help me debug this issue?" → "Help debug issue"
- "Please send me the updated designs" → "Send updated designs"
- "What's the status of the deployment?" → "Provide deployment status update"

Examples of NON-actionable messages:
- "Thanks for your help!" → Not actionable
- "Good morning!" → Not actionable
- "FYI - meeting moved to 3pm" → Not actionable
- "Congrats on the promotion!" → Not actionable

Respond in valid JSON format only:
{{"is_actionable": true/false, "task_text": "extracted task or empty string"}}"""

        return prompt
    
    def _extract_mention_context(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract mention-specific context from message
        
        Args:
            message_data: Slack message data
            
        Returns:
            Dictionary with mention context
        """
        text = message_data.get('text', '')
        
        # Find mentioned users
        mentioned_users = re.findall(r'<@([UW][A-Z0-9]+)>', text)
        
        # Check for deadline indicators
        deadline_keywords = [
            r'by\s+(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)',
            r'by\s+\d{1,2}(am|pm)',
            r'by\s+end\s+of\s+(day|week|month)',
            r'by\s+eod',
            r'before\s+',
            r'until\s+',
            r'deadline\s+',
            r'due\s+'
        ]
        
        has_deadline = any(re.search(pattern, text.lower()) for pattern in deadline_keywords)
        
        # Check for urgency indicators
        urgency_keywords = ['urgent', 'asap', 'emergency', 'critical', 'immediately']
        has_urgency = any(keyword in text.lower() for keyword in urgency_keywords)
        
        # Check for question patterns
        is_question = text.strip().endswith('?') or any(
            text.lower().startswith(q) for q in ['what', 'when', 'where', 'who', 'why', 'how', 'can', 'could', 'would', 'do', 'did']
        )
        
        return {
            'mentioned_users': mentioned_users,
            'has_deadline': has_deadline,
            'has_urgency': has_urgency,
            'is_question': is_question,
            'is_thread_reply': bool(message_data.get('thread_ts'))
        }
    
    async def _call_anthropic(self, prompt: str) -> str:
        """
        Call Anthropic API with the analysis prompt
        
        Args:
            prompt: Analysis prompt
            
        Returns:
            AI response text
        """
        try:
            response = self.client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=200,
                temperature=0.1,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            return response.content[0].text
            
        except Exception as e:
            raise Exception(f"Anthropic API call failed: {str(e)}")
    
    def _parse_ai_response(self, response: str) -> Tuple[bool, str]:
        """
        Parse AI response JSON
        
        Args:
            response: AI response text
            
        Returns:
            Tuple of (is_actionable, task_text)
        """
        try:
            # Clean response text (remove any markdown code blocks)
            cleaned_response = response.strip()
            if cleaned_response.startswith('```json'):
                cleaned_response = cleaned_response[7:]
            if cleaned_response.endswith('```'):
                cleaned_response = cleaned_response[:-3]
            cleaned_response = cleaned_response.strip()
            
            # Parse JSON
            parsed = json.loads(cleaned_response)
            
            is_actionable = bool(parsed.get('is_actionable', False))
            task_text = str(parsed.get('task_text', '')).strip()
            
            # Additional validation
            if is_actionable and not task_text:
                is_actionable = False
            
            return is_actionable, task_text
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse AI response as JSON: {response}")
            print(f"JSON error: {str(e)}")
            return False, ""
        except Exception as e:
            print(f"Error parsing AI response: {str(e)}")
            return False, ""
    
    def extract_thread_context(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract context from thread if message is a thread reply
        
        Args:
            message_data: Slack message data
            
        Returns:
            Dictionary with thread context
        """
        thread_context = {
            'is_thread_reply': bool(message_data.get('thread_ts')),
            'thread_ts': message_data.get('thread_ts'),
            'parent_message_ts': message_data.get('thread_ts')
        }
        
        return thread_context
    
    def clean_message_text(self, text: str) -> str:
        """
        Clean message text for better AI processing
        
        Args:
            text: Original message text
            
        Returns:
            Cleaned message text
        """
        # Remove user mentions for cleaner processing
        cleaned = re.sub(r'<@[UW][A-Z0-9]+>', '', text)
        
        # Remove channel mentions
        cleaned = re.sub(r'<#[C][A-Z0-9]+>', '', cleaned)
        
        # Remove excessive whitespace
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        
        return cleaned
    
    def is_likely_actionable(self, message_data: Dict[str, Any]) -> bool:
        """
        Quick heuristic check if message is likely actionable
        This can be used to filter messages before expensive AI processing
        
        Args:
            message_data: Slack message data
            
        Returns:
            True if message might be actionable
        """
        text = message_data.get('text', '').lower()
        
        # Quick filters for obviously non-actionable messages
        non_actionable_patterns = [
            r'^(thanks?|thank you)',
            r'^(hi|hello|hey)',
            r'^(good morning|good afternoon|good evening)',
            r'^(congrats|congratulations)',
            r'^(fyi|just fyi)',
            r'^(lol|haha|😄|😂)'
        ]
        
        if any(re.match(pattern, text) for pattern in non_actionable_patterns):
            return False
        
        # Quick filters for likely actionable messages
        actionable_patterns = [
            r'(can|could|would) you',
            r'please\s+',
            r'\?$',  # Questions
            r'(help|assist|support)',
            r'(review|check|look at)',
            r'(send|share|provide)',
            r'(update|status|progress)',
            r'(by|before|until)\s+(today|tomorrow|friday)'
        ]
        
        return any(re.search(pattern, text) for pattern in actionable_patterns)