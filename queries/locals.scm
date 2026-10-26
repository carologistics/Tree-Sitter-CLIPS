; Scopes, definitions and references of local variables.
;
; A CLIPS variable binds at its first occurrence in a rule's LHS; later
; occurrences are equality tests. Queries can't tell them apart, so every
; LHS occurrence is tagged as a definition.

; --------------------------------------------------------------------
; Scopes
; --------------------------------------------------------------------
(defrule_body) @local.scope
(deffunction_construct) @local.scope
(defmethod_construct) @local.scope
(defmessage_handler_construct) @local.scope

; --------------------------------------------------------------------
; Definitions
; --------------------------------------------------------------------

; Fact-address binding: ?f <- (pattern ...)
(assigned_pattern_CE
  (single_field_variable) @local.definition.var)

; deffunction / defmethod / defmessage-handler parameters
(regular_parameter) @local.definition.var
(wildcard_parameter) @local.definition.var
(parameter) @local.definition.var
(parameter_restriction
  (single_field_variable) @local.definition.var)
(wildcard_parameter_restriction
  (multifield_variable) @local.definition.var)

; LHS pattern variables (see the note at the top).
(single_field_LHS_slot
  (constraint (connected_constraint (single_constraint (term (single_field_variable) @local.definition.var)))))
(multifield_LHS_slot
  (constraint (connected_constraint (single_constraint (term (single_field_variable) @local.definition.var)))))
(multifield_LHS_slot
  (constraint (connected_constraint (single_constraint (term (multifield_variable) @local.definition.var)))))
(ordered_pattern_CE
  (constraint (connected_constraint (single_constraint (term (single_field_variable) @local.definition.var)))))

; Object pattern attributes bind like template slots: ?x in
; (object (is-a Warehouse) (name ?x)).
(attribute_constraint
  (constraint (connected_constraint (single_constraint (term (single_field_variable) @local.definition.var)))))
(attribute_constraint
  (constraint (connected_constraint (single_constraint (term (multifield_variable) @local.definition.var)))))

; defglobal: the variable being assigned is the definition site.
(global_assignment
  (global_variable) @local.definition.var)

; --------------------------------------------------------------------
; References
; --------------------------------------------------------------------

; Any variable used inside an action (RHS of a rule, deffunction
; body, method/handler body) is a reference to whatever bound it.
(action (variable) @local.reference.var)
(action (function_call (variable) @local.reference.var))

; Variables used as RHS fields when asserting/modifying facts.
(RHS_field (variable) @local.reference.var)

; The fact/instance being changed, and slot-override values:
; (modify ?f ...), (modify-instance ?i (age ?a)).
(fact_action (variable) @local.reference.var)
(instance_action (variable) @local.reference.var)
(slot_override (variable) @local.reference.var)

; Variables used inside a predicate/return-value constraint's
; nested function call, e.g. ?x&:(> ?x ?y) -- the call's arguments
; reference already-bound pattern variables.
(term
  (function_call
    (variable) @local.reference.var))

; special_variable's own variable part (?x:slot) references an
; object/instance bound elsewhere (typically by an instance-set
; query template); the slot name after ':' is not a variable.
(special_variable
  (symbol) @local.reference.var)

; An instance set member's variable is a definition, like a fact set member's.
(instance_set_member_template
  (single_field_variable) @local.definition.var)
(fact_set_member_template
  (single_field_variable) @local.definition.var)

; progn$ and loop-for-count bind their variable inside parentheses.
(progn_dollar_binding
  (single_field_variable) @local.definition.var)
(loop_for_count_binding
  (single_field_variable) @local.definition.var)

; bind's target is a definition, not a read.
(function_call
  (function_name) @_fname
  (variable (single_field_variable) @local.definition.var)
  (#eq? @_fname "bind"))

; Globals used outside their defglobal. LHS constraints cannot contain globals.
(action (variable (global_variable) @local.reference.var))
(RHS_field (variable (global_variable) @local.reference.var))
