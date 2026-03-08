import os
import json
from typing import AsyncGenerator, List, Dict, Any, Optional
import anthropic
from dotenv import load_dotenv

from .system_prompt import get_system_prompt
from .tools import get_tools

load_dotenv()

MODEL = "claude-sonnet-4-6"


class AIClient:
    """Anthropic AI client with streaming, Tool Use, and prompt caching."""

    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable is not set")
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = MODEL
        self.system_prompt = get_system_prompt()
        self.tools = get_tools()

    async def stream_chat(
        self,
        messages: List[Dict[str, Any]],
        tool_executor,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream chat with Tool Use loop.
        Yields SSE event dicts with type, content, etc.
        Handles multi-turn tool use until stop_reason == "end_turn".
        """
        current_messages = list(messages)

        while True:
            # Collect full response from streaming
            accumulated_text = ""
            tool_use_blocks = []
            stop_reason = None
            assistant_content_blocks = []

            with self.client.messages.stream(
                model=self.model,
                max_tokens=4096,
                system=self.system_prompt,
                tools=self.tools,
                messages=current_messages,
            ) as stream:
                # Stream text events in real time
                for event in stream:
                    if hasattr(event, "type"):
                        if event.type == "content_block_start":
                            if hasattr(event, "content_block"):
                                block = event.content_block
                                if block.type == "text":
                                    pass  # text will come via delta
                                elif block.type == "tool_use":
                                    # Notify client a tool call is starting
                                    yield {
                                        "type": "tool_call_start",
                                        "name": block.name,
                                        "id": block.id,
                                    }
                                    tool_use_blocks.append({
                                        "type": "tool_use",
                                        "id": block.id,
                                        "name": block.name,
                                        "input": {},
                                        "_input_json": "",
                                    })

                        elif event.type == "content_block_delta":
                            if hasattr(event, "delta"):
                                delta = event.delta
                                if delta.type == "text_delta":
                                    accumulated_text += delta.text
                                    yield {"type": "text", "content": delta.text}
                                elif delta.type == "input_json_delta":
                                    # Accumulate JSON for the last tool_use block
                                    if tool_use_blocks:
                                        tool_use_blocks[-1]["_input_json"] += delta.partial_json

                        elif event.type == "message_stop":
                            pass

                # Get final message for stop_reason
                final_message = stream.get_final_message()
                stop_reason = final_message.stop_reason

                # Parse tool inputs from accumulated JSON
                for block in tool_use_blocks:
                    raw_json = block.pop("_input_json", "{}")
                    try:
                        block["input"] = json.loads(raw_json) if raw_json else {}
                    except json.JSONDecodeError:
                        block["input"] = {}

                # Build assistant content blocks for message history
                assistant_content_blocks = []
                if accumulated_text:
                    assistant_content_blocks.append({"type": "text", "text": accumulated_text})
                for block in tool_use_blocks:
                    assistant_content_blocks.append({
                        "type": "tool_use",
                        "id": block["id"],
                        "name": block["name"],
                        "input": block["input"],
                    })

            # Add assistant response to messages
            current_messages.append({
                "role": "assistant",
                "content": assistant_content_blocks,
            })

            # If stop_reason is end_turn or no tool_use blocks, we're done
            if stop_reason == "end_turn" or not tool_use_blocks:
                break

            # Process tool calls
            tool_results = []
            for tool_block in tool_use_blocks:
                tool_name = tool_block["name"]
                tool_input = tool_block["input"]
                tool_id = tool_block["id"]

                yield {
                    "type": "tool_call",
                    "name": tool_name,
                    "input": tool_input,
                }

                # Execute the tool
                result = tool_executor.execute(tool_name, tool_input)

                yield {
                    "type": "tool_result",
                    "name": tool_name,
                    "result": result,
                }

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tool_id,
                    "content": json.dumps(result, ensure_ascii=False),
                })

            # Add tool results to messages and continue the loop
            current_messages.append({
                "role": "user",
                "content": tool_results,
            })

        # Signal completion
        yield {"type": "done"}

        # Return updated messages for storage
        # We add all the assistant + tool result messages to the original list
        # The caller will use current_messages for storage
        self._last_messages = current_messages

    def get_last_messages(self) -> List[Dict[str, Any]]:
        """Return the final message history after stream_chat completes."""
        return getattr(self, "_last_messages", [])

    def generate_plan(self, client_info: Dict[str, Any], additional_info: Optional[str] = None) -> str:
        """Generate a support plan document for a client (non-streaming)."""
        prompt = f"""以下の利用者情報を基に、サービス等利用計画書を作成してください。

## 利用者情報
{json.dumps(client_info, ensure_ascii=False, indent=2)}

"""
        if additional_info:
            prompt += f"\n## 追加情報\n{additional_info}\n"

        prompt += """
## 作成する計画書の内容
1. 利用者の意向・希望
2. 総合的な支援の方針
3. 長期目標（1〜2年）
4. 短期目標（3〜6ヶ月）
5. 必要なサービスと支援内容
6. モニタリング計画

Markdown形式で作成してください。"""

        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=self.system_prompt,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text

    def summarize_record(self, content: str) -> str:
        """Summarize a case record (non-streaming)."""
        prompt = f"""以下の支援記録を要約してください。200文字以内で、重要なポイントと次回の対応方針を含めてください。

## 支援記録
{content}

要約："""

        response = self.client.messages.create(
            model=self.model,
            max_tokens=512,
            system=self.system_prompt,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text

    def generate_report(
        self,
        client_info: Dict[str, Any],
        records: List[Dict[str, Any]],
        plan_info: Optional[Dict[str, Any]] = None,
        period_start: Optional[str] = None,
        period_end: Optional[str] = None,
        additional_notes: Optional[str] = None,
    ) -> str:
        """Generate a monitoring report (non-streaming)."""
        prompt = f"""以下の情報を基に、モニタリング報告書を作成してください。

## 利用者情報
{json.dumps(client_info, ensure_ascii=False, indent=2)}

"""
        if plan_info:
            prompt += f"## 現在の支援計画\n{json.dumps(plan_info, ensure_ascii=False, indent=2)}\n\n"

        if period_start and period_end:
            prompt += f"## モニタリング期間\n{period_start} ～ {period_end}\n\n"

        if records:
            prompt += f"## 支援記録（期間中）\n{json.dumps(records, ensure_ascii=False, indent=2)}\n\n"

        if additional_notes:
            prompt += f"## 追加情報・特記事項\n{additional_notes}\n\n"

        prompt += """## 作成するモニタリング報告書の内容
1. モニタリング実施日・方法
2. 利用者・家族の意向確認結果
3. 目標達成状況の評価（長期目標・短期目標）
4. サービス利用状況
5. 生活状況の変化
6. 課題と今後の支援方針
7. 計画変更の要否

Markdown形式で作成してください。"""

        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=self.system_prompt,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text
