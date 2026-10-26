; Named constructs for the outline, workspace symbols and the language
; server's symbol table. @name is the identifier, @definition.KIND the construct.

(defrule_construct
  (name) @name) @definition.function

(deffunction_construct
  (name) @name) @definition.function

(defgeneric_construct
  (name) @name) @definition.function

(defmethod_construct
  (name) @name) @definition.method

(deftemplate_construct
  (name) @name) @definition.type

(defclass_construct
  (name) @name) @definition.class

(defmodule_construct
  (name) @name) @definition.module

(deffacts_construct
  (name) @name) @definition.constant

(definstances_construct
  (name) @name) @definition.constant

(defglobal_construct
  (global_assignment
    (global_variable) @name)) @definition.constant

; A message handler names its class first, then itself. The handler is
; @name; the class is captured separately.
(defmessage_handler_construct
  . (name) @definition.defmessage_handler.class
  (name) @name) @definition.method

; Slots, nested under their template or class.
(single_slot_definition
  (name) @name) @definition.field

(multislot_definition
  (name) @name) @definition.field

(slot
  (name) @name) @definition.field
