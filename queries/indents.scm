; Indentation, for editors that read tree-sitter queries.

; Anything that opens a new block gets an indent level.
[
  (construct)
  (fact_query)
  (instance_query)
  (query)
  (then)
  (else)
] @indent.begin

; Parenthesized rules: align their contents to the opening paren.
[
  (deffacts_construct)
  (defglobal_construct)
  (defrule_construct)
  (deftemplate_construct)
  (deffunction_construct)
  (defgeneric_construct)
  (defmethod_construct)
  (defclass_construct)
  (definstances_construct)
  (defmessage_handler_construct)
  (defmodule_construct)

  (single_slot_definition)
  (multislot_definition)
  (slot)
  (default_attribute)
  (type_attribute)
  (allowed_constant_attribute)
  (range_attribute)
  (cardinality_attribute)

  (function_call)
  (if_statement)
  (template_RHS_pattern)
  (ordered_RHS_pattern)
  (single_field_RHS_slot)
  (multifield_RHS_slot)

  (template_pattern_CE)
  (ordered_pattern_CE)
  (object_pattern_CE)
  (single_field_LHS_slot)
  (multifield_LHS_slot)
  (not_CE)
  (and_CE)
  (or_CE)
  (logical_CE)
  (test_CE)
  (exists_CE)
  (forall_CE)

  (declaration)
  (rule_property)

  (fact_set_template)
  (fact_set_member_template)
  (instance_set_template)
  (instance_set_member_template)

  (instance_template)
  (slot_override)

  (port_specification)
] @indent.align
(#set! indent.open_delimiter "(")
(#set! indent.close_delimiter ")")
