; Syntax highlighting for CLIPS, using the standard tree-sitter capture names.

; -------------------------------------------------------------------
; Construct-introducing keywords
; -------------------------------------------------------------------
"defrule" @keyword
"deftemplate" @keyword
"deffacts" @keyword
"defglobal" @keyword
"deffunction" @keyword
"defclass" @keyword
"definstances" @keyword
"defmessage-handler" @keyword
"defmodule" @keyword
"defgeneric" @keyword
"defmethod" @keyword

; -------------------------------------------------------------------
; Structural / facet keywords
; -------------------------------------------------------------------
"slot" @keyword
"multislot" @keyword
"field" @keyword
"multifield" @keyword
"is-a" @keyword
"role" @keyword
"pattern-match" @keyword
"declare" @keyword
"salience" @keyword
"auto-focus" @keyword
"default" @keyword
"default-dynamic" @keyword
"type" @keyword
"range" @keyword
"cardinality" @keyword
"storage" @keyword
"access" @keyword
"propagation" @keyword
"source" @keyword
"visibility" @keyword
"create-accessor" @keyword
"override-message" @keyword
"message-handler" @keyword
"export" @keyword
"import" @keyword
"active" @keyword
"of" @keyword
"if" @keyword
"with-open-file" @keyword
(then) @keyword
(else) @keyword

"allowed-symbols" @keyword
"allowed-strings" @keyword
"allowed-lexemes" @keyword
"allowed-integers" @keyword
"allowed-floats" @keyword
"allowed-numbers" @keyword
"allowed-instance-names" @keyword
"allowed-classes" @keyword
"allowed-values" @keyword

; -------------------------------------------------------------------
; Conditional element keywords (defrule LHS)
; -------------------------------------------------------------------
"not" @keyword
"and" @keyword
"or" @keyword
"logical" @keyword
"test" @keyword
"exists" @keyword
"forall" @keyword
"object" @keyword

; -------------------------------------------------------------------
; Query function keywords
; -------------------------------------------------------------------
"any-factp" @function.builtin
"find-fact" @function.builtin
"find-all-facts" @function.builtin
"do-for-fact" @function.builtin
"do-for-all-facts" @function.builtin
"delayed-do-for-all-facts" @function.builtin
"any-instancep" @function.builtin
"find-instance" @function.builtin
"find-all-instances" @function.builtin
"do-for-instance" @function.builtin
"do-for-all-instances" @function.builtin
"delayed-do-for-all-instances" @function.builtin

; -------------------------------------------------------------------
; `name` is reused everywhere in the grammar, so it must be
; disambiguated by its parent construct, not tagged in bulk.
; -------------------------------------------------------------------
(defrule_construct (name) @function)
(deffunction_construct (name) @function)
(defgeneric_construct (name) @function)
(defmethod_construct (name) @function)

(deftemplate_construct (name) @type)
(defclass_construct (name) @type)

(defmodule_construct (name) @namespace)
(defglobal_construct (name) @namespace)

(deffacts_construct (name) @variable)
(definstances_construct (name) @variable)

; defmessage_handler_construct has two `name` children in sequence:
; the receiving class, then the handler/message name.
(defmessage_handler_construct . (name) @type (name) @function)
(handler_documentation (name) @function)

(qualified_name) @type

; slot names (deftemplate slot definitions, defclass slots, and
; slot references inside LHS/RHS patterns and attribute constraints)
(single_slot_definition (name) @property)
(multislot_definition (name) @property)
(slot (name) @property)
(single_field_LHS_slot (name) @property)
(multifield_LHS_slot (name) @property)
(single_field_RHS_slot (name) @property)
(multifield_RHS_slot (name) @property)
(attribute_constraint (name) @property)

; -------------------------------------------------------------------
; Function calls
; -------------------------------------------------------------------
(function_name) @function
(fact_action_name) @function
(instance_action_name) @function
(function_name "=" ) @operator
(function_name "<=") @operator
(function_name "<" ) @operator
(function_name ">" ) @operator
(function_name ">=") @operator
(function_name "<>") @operator

; -------------------------------------------------------------------
; Variables
; -------------------------------------------------------------------
(single_field_variable) @variable
(multifield_variable) @variable
(special_variable) @variable
(global_variable) @variable.global
(multifield_global_variable) @variable.global

(regular_parameter) @variable.parameter
(wildcard_parameter) @variable.parameter
(parameter) @variable.parameter
(parameter_restriction) @variable.parameter
(wildcard_parameter_restriction) @variable.parameter

; -------------------------------------------------------------------
; Literals
; -------------------------------------------------------------------
(constant (symbol)) @constant
(instance_name) @constant
(boolean_symbol) @boolean
(allowed_type) @type.builtin
(number) @number
(string) @string
(comment) @comment.documentation
(comment_line) @comment

; -------------------------------------------------------------------
; Operators / punctuation
; -------------------------------------------------------------------
"<-" @operator
"=>" @operator
"&" @operator
"|" @operator
"~" @operator
"::" @punctuation.delimiter
":" @punctuation.delimiter
(constraint "?") @operator
(constraint "$?") @operator

"(" @punctuation.bracket
")" @punctuation.bracket
