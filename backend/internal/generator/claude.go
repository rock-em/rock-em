package generator

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

const model = "claude-haiku-5-5"

const systemPrompt = `You write original programming practice problems for an interview prep site.

Each problem must teach the topic the learner asks for. Do not reuse or lightly reskin well-known LeetCode problems (Two Sum, Valid Parentheses, Number of Islands and so on); invent a fresh scenario where the topic is the natural tool for the job. When the learner gives an industry or theme, set the scenario there with realistic names and data, but keep the statement self-contained so no domain knowledge is needed to solve it.

Match the requested level:
- beginner: one core idea, small inputs, a direct application of the topic.
- intermediate: the topic combined with one other idea or a non-obvious edge case.
- advanced: requires a careful, efficient use of the topic; state complexity expectations in the constraints.

Solutions are written in JavaScript as a single top-level function declaration. The function takes positional arguments and returns a value. Arguments and return values must be plain JSON values (numbers, strings, booleans, null, arrays, objects); do not use linked lists, trees with pointers, classes, Maps or Sets as inputs or outputs. When several answers would be correct, define a single canonical answer in the description (for example "return the indices in ascending order") so results can be compared exactly.

Fields:
- title: short and descriptive.
- description: the full problem statement in plain text, naming each parameter and what to return.
- examples: two or three worked examples. input reads like "orders = [3, 1], limit = 2"; output is the returned value; explanation may be empty.
- constraints: input size and value ranges, plus any guarantees.
- functionName: a camelCase JavaScript identifier.
- starter: "function <functionName>(<params>) {\n  // Write your solution here\n  \n}".
- referenceSolution: a correct, complete solution.
- tests: 8 to 12 cases. inputJson is a JSON array of the positional arguments; expectedJson is the JSON-encoded return value. Cover the examples, the smallest valid inputs, boundaries and tricky edge cases. Every expected value must be exactly what referenceSolution returns; trace each one carefully.`

// Generator produces a new problem for a request.
type Generator interface {
	Generate(ctx context.Context, req Request) (Problem, error)
}

// ClaudeGenerator generates problems with the Claude API.
type ClaudeGenerator struct {
	client anthropic.Client
}

func NewClaudeGenerator(opts ...option.RequestOption) *ClaudeGenerator {
	return &ClaudeGenerator{client: anthropic.NewClient(opts...)}
}

func (g *ClaudeGenerator) Generate(ctx context.Context, req Request) (Problem, error) {
	message, err := g.client.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     model,
		MaxTokens: 16000,
		System:    []anthropic.TextBlockParam{{Text: systemPrompt}},
		Messages: []anthropic.MessageParam{
			anthropic.NewUserMessage(anthropic.NewTextBlock(userPrompt(req))),
		},
		OutputConfig: anthropic.OutputConfigParam{
			Effort: anthropic.OutputConfigEffortHigh,
			Format: anthropic.JSONOutputFormatParam{Schema: outputSchema},
		},
	})
	if err != nil {
		return Problem{}, fmt.Errorf("claude request: %w", err)
	}

	switch message.StopReason {
	case anthropic.StopReasonRefusal:
		return Problem{}, errors.New("the model declined to generate this problem")
	case anthropic.StopReasonMaxTokens:
		return Problem{}, errors.New("the model ran out of output tokens")
	}

	var text strings.Builder
	for _, block := range message.Content {
		if block.Type == "text" {
			text.WriteString(block.Text)
		}
	}

	return parseProblem(text.String(), req)
}

func userPrompt(req Request) string {
	var b strings.Builder
	fmt.Fprintf(&b, "Topic to learn: %s\n", req.Topic)
	if req.Theme != "" {
		fmt.Fprintf(&b, "Industry or theme: %s\n", req.Theme)
	} else {
		b.WriteString("Industry or theme: any realistic setting\n")
	}
	fmt.Fprintf(&b, "Level: %s\n", req.Level)
	return b.String()
}
