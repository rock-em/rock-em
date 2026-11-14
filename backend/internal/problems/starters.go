package problems

import (
	"strings"
	"unicode"
)

// A language is offered for every problem once it has a generator here (or a
// problem has a stored override). Generated code is plain text for the editor.
type language struct {
	name   func(string) string
	types  map[string]string
	array  func(string) string
	render func(s Signature, name func(string) string, types func(string) string, indent string) string
}

var languages = map[string]language{
	"python": {
		name:  snakeCase,
		types: map[string]string{"int": "int", "long": "int", "double": "float", "bool": "bool", "string": "str", "char": "str", "ListNode": "ListNode | None", "TreeNode": "TreeNode | None", "void": "None"},
		array: func(t string) string { return "list[" + t + "]" },
		render: func(s Signature, name func(string) string, types func(string) string, indent string) string {
			var b strings.Builder
			nodeComments(&b, s, "# ", "None")
			outputComment(&b, s, "# ", name)
			params := make([]string, len(s.Params))
			for i, p := range s.Params {
				params[i] = name(p.Name) + ": " + types(p.Type)
			}
			b.WriteString("def " + name(s.Function) + "(" + strings.Join(params, ", ") + ") -> " + types(s.Returns) + ":\n")
			b.WriteString(indent + "# Write your solution here\n" + indent + "pass\n")
			return b.String()
		},
	},
	"javascript": {
		name:  func(s string) string { return s },
		types: map[string]string{"int": "number", "long": "number", "double": "number", "bool": "boolean", "string": "string", "char": "string", "ListNode": "ListNode | null", "TreeNode": "TreeNode | null", "void": "void"},
		array: func(t string) string {
			if strings.Contains(t, " ") {
				return "(" + t + ")[]"
			}
			return t + "[]"
		},
		render: func(s Signature, name func(string) string, types func(string) string, indent string) string {
			var b strings.Builder
			nodeComments(&b, s, "// ", "null")
			outputComment(&b, s, "// ", name)
			b.WriteString("/**\n")
			params := make([]string, len(s.Params))
			for i, p := range s.Params {
				params[i] = p.Name
				b.WriteString(" * @param {" + types(p.Type) + "} " + p.Name + "\n")
			}
			b.WriteString(" * @return {" + types(s.Returns) + "}\n */\n")
			b.WriteString("function " + s.Function + "(" + strings.Join(params, ", ") + ") {\n")
			b.WriteString(indent + "// Write your solution here\n}\n")
			return b.String()
		},
	},
}

func (l language) typeName(t string) string {
	if base, ok := strings.CutSuffix(t, "[]"); ok {
		return l.array(l.typeName(base))
	}
	return l.types[t]
}

func (l language) starter(s Signature, indent string) string {
	return l.render(s, l.name, l.typeName, indent)
}

// The runner defines node classes before user code; the starter only documents them.
func nodeComments(b *strings.Builder, s Signature, comment, empty string) {
	uses := func(node string) bool {
		if strings.HasPrefix(s.Returns, node) {
			return true
		}
		for _, p := range s.Params {
			if strings.HasPrefix(p.Type, node) {
				return true
			}
		}
		return false
	}
	if uses("ListNode") {
		b.WriteString(comment + "ListNode has val and next; the last node's next is " + empty + ".\n")
	}
	if uses("TreeNode") {
		b.WriteString(comment + "TreeNode has val, left and right; missing children are " + empty + ".\n")
	}
	if uses("ListNode") || uses("TreeNode") {
		b.WriteString("\n")
	}
}

func outputComment(b *strings.Builder, s Signature, comment string, name func(string) string) {
	switch {
	case s.Output == "":
		return
	case s.Returns == "void":
		b.WriteString(comment + "Modify " + name(s.Output) + " in place; nothing is returned.\n\n")
	default:
		b.WriteString(comment + "Return k and put the answer in the first k items of " + name(s.Output) + ".\n\n")
	}
}

func snakeCase(s string) string {
	var b strings.Builder
	runes := []rune(s)
	for i, r := range runes {
		if unicode.IsUpper(r) && i > 0 && (unicode.IsLower(runes[i-1]) || unicode.IsDigit(runes[i-1])) {
			b.WriteByte('_')
		}
		b.WriteRune(unicode.ToLower(r))
	}
	return b.String()
}
