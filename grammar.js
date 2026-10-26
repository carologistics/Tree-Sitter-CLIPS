module.exports = grammar({
  name: 'clips',
  extras: $ => [
  $.comment_line,
  /[\s\t\n]/
  ],

  // New: a fact is read both normally and plainly (see _plain_RHS_pattern);
  // the two readings split at the fact name.
  conflicts: $ => [
    [$._fact_name, $._plain_fact_name],
  ],

  rules: {
    // Old: a list of constructs, or a single fact query as the whole
    // program. Batch files mix constructs with top-level calls such as
    // (load "x.clp") (reset) (run), so any function call is allowed now.
    CLIPS_program: $ => repeat(choice($.construct, $.function_call)),
    global_assignment: $ => seq($.global_variable, '=', $._expression),

    global_variable: $ => /\?\*[^\s"()\&|<~]*\*/,

    _class_name: $ => $.name,
    _message_name: $ => $.name,
    _deftemplate_name: $ => $.name,
    _defmodule_name: $ => $.name,
    _superclass_name: $ => $.name,
    _definstances_name: $ => $.name,
    _module_name: $ => $.name,
    _construct_name: $ => $.name,
    // Old: symbol only. Construct names may be module-qualified (MAIN::foo).
    name: $ => prec(1, choice($.symbol, $.qualified_name)),
    qualified_name: $ => seq($.symbol, '::', $.symbol),
    string: $ => /"[^"]*"/,
    string: $ => /\"([^\"\\]|\\.)*\"/,
    // New. CLIPS rejects ?_x, ?1x, ?-x ([SCANNER2]); the old grammar read
    // them as the ? wildcard followed by a symbol. After a `?`, such a word
    // is this token, and _misnamed_variable then requires a variable name
    // that can't follow, so the parse fails at the same place CLIPS does.
    // Must be defined before the number, instance-name and symbol tokens to
    // win equal-length matches. No lexical prec: in error recovery it would
    // beat the > of =>.
    invalid_variable_name: $ => token.immediate(/[^a-zA-Z*\u0080-\uFFFF\s()";][^\s"()&|~;<]*/),

    // Old: only d.d. CLIPS (ScanNumber, core/scanner.c) also reads 5., .5,
    // 1e3 and -2.5E-2 as floats.
    float: $ => prec(2,/[+-]?(\d+\.\d*([eE][+-]?\d+)?|\.\d+([eE][+-]?\d+)?|\d+[eE][+-]?\d+)/),
    integer: $ => prec(1,/[+-]?\d+/),
    _index: $ => $.integer,
    // Old: seq('[', symbol, ']'). CLIPS scans an instance name as one word
    // (ScanSymbol), so [pump-1] is one token and a[1] is a plain symbol.
    // Defined before `symbol` so [a] is an instance name.
    instance_name: $ => /\[[^\s"()&|~;<]+\]/,
    number: $ => prec(1,choice($.float, $.integer)),
    lexeme: $ => choice($.symbol, $.string),
    // Added qualified_name: (focus MAIN::x), (ppdefrule MAIN::r) were errors.
    constant: $ => prec(2,choice($.number, $.string, $.symbol, $.qualified_name, $.instance_name)),
    comment: $ => prec(1,/\"([^\"\\]|\\.)*\"/),
    comment_line: $ => token(seq(';', /[^\n\r]*/)),

    // Old: _variable_symbol was $.symbol, so (a ? x) read as the variable
    // ?x. The name must follow ? or $? directly and start with a letter, a
    // non-ASCII character or *, as in CLIPS. No `:`, so ?self:slot stays a
    // special_variable. Defined before `symbol` so ?x is a variable and not
    // the wildcard plus a symbol.
    _variable_symbol: $ => alias(token.immediate(/[a-zA-Z*\u0080-\uFFFF][^\s"()&|~;<:]*/), $.symbol),

    // Can never complete: see invalid_variable_name.
    _misnamed_variable: $ => seq($.invalid_variable_name, $._variable_symbol),
    // Old: an allow-list, [a-zA-Z0-9_\-\/\+$\*]+ with an optional leading <.
    // It rejected valid symbols such as !=, type.animal and solution?. Now
    // CLIPS's rule (ScanSymbol): a symbol runs until whitespace or one of
    // " ( ) & | ~ ; <. Exceptions: ? and $? can't start it (variables);
    // single `:` is allowed inside (12:30, http://x.org) but `::` is left
    // for qualified_name.
    symbol: $ => prec(3,/([^\s"()&|~;<?$:]|<|\$[^\s"()&|~;<?:])[^\s"()&|~;<:]*(:[^\s"()&|~;<:]+)*|\$/),


    // Added qualified_name: (UTIL::double 21) calls a function exported by
    // UTIL (Function2Parse, core/exprnpsr.c).
    function_name: $ =>  prec(2,choice($.symbol, $.qualified_name, "=", "<=", "<", ">", ">=", "<>")),
    _slot_name: $ => prec(1, $.name),
    _rule_name: $ => $.name,
    _fact_name: $ => $.name,

	// Old: prec 3 and 2, below constraint's bare '?' (prec 4), so the slot
	// (bar ?x) silently parsed as the wildcard ? plus a symbol x. The old
	// multifield token '$is?' was a typo for '$?'.
	single_field_variable: $ => prec.left(5,seq('?', choice($._variable_symbol, $._misnamed_variable))),
	multifield_variable: $ => prec(5, seq('$?', choice($._variable_symbol, $._misnamed_variable))),
	special_variable: $ => prec(1,seq('?', $._variable_symbol, ':', $._slot_name)),

    // New. $?*x* is one token in CLIPS (MF_GBL_VARIABLE_TOKEN); before, it
    // lexed as $? plus the symbol *x*.
    multifield_global_variable: $ => /\$\?\*[^\s"()\&|<~]*\*/,
    variable: $ => choice($.special_variable, $.single_field_variable, $.multifield_variable, $.global_variable, $.multifield_global_variable),
	cond_body: $ => repeat1($._expression),
    then: $ => "then",
    else: $ => "else",
    // Bodies are optional now: CLIPS accepts (if ?x then) (IfParse,
    // core/prcdrpsr.c).
    if_statement: $ => seq('(', "if", $._expression, $.then, optional($.cond_body), optional(seq($.else, optional($.cond_body))), ')'),

    // New alternatives for calls whose arguments aren't plain expressions.
    // In the old grammar they went through the generic call and either
    // failed (progn$/loop-for-count bindings, with-open-file) or produced
    // wrong nodes (fact names and slots in assert/modify read as calls).
    function_call: $ => choice($.fact_query, $.instance_query, $.if_statement, $.progn_dollar_expression, $.loop_for_count_expression, $.with_open_file_expression, $.fact_action, $.instance_action, $._plain_call),
    // The old generic call, split out so _plain_RHS_pattern can reuse it.
    _plain_call: $ => seq('(', $.function_name, repeat($._expression), ')'),

    // New. One rule per family instead of one per function. The function
    // name has to be a keyword: (assert (foo)) and (printout (foo)) have
    // the same tokens. assert takes RHS patterns; modify/duplicate take a
    // fact specifier and slots (ModAndDupParse, core/tmpltfun.c).
    fact_action: $ => seq(
      '(',
      choice(
        seq(alias('assert', $.fact_action_name), repeat1($.RHS_pattern)),
        seq(alias(choice('modify', 'duplicate'), $.fact_action_name), $._fact_specifier, repeat($.RHS_slot))
      ),
      ')'
    ),
    _fact_specifier: $ => choice($.variable, $.integer, $.function_call),

    // New. make-instance takes [name] of class; the others take an
    // instance, optionally `to` a new name, then slot overrides.
    instance_action: $ => seq(
      '(', $.instance_action_name,
      choice(
        $.instance_definition,
        seq($._expression, optional(seq('to', $._expression)), repeat($.slot_override))
      ),
      ')'
    ),
    instance_action_name: $ => choice(
      'make-instance', 'active-make-instance',
      'modify-instance', 'active-modify-instance', 'message-modify-instance', 'active-message-modify-instance',
      'duplicate-instance', 'active-duplicate-instance', 'message-duplicate-instance', 'active-message-duplicate-instance',
      'initialize-instance', 'active-initialize-instance'
    ),

    // New. (progn$ (?x $?list) ...): a variable can't be a function_name,
    // so the binding form was an ERROR in the old grammar.
    progn_dollar_expression: $ => seq(
      '(', 'progn$',
      choice($._expression, $.progn_dollar_binding),
      repeat($.action),
      ')'
    ),
    progn_dollar_binding: $ => seq('(', $.single_field_variable, $._expression, ')'),

    // New, same reason as progn$: (loop-for-count (?i 1 10) ...). CLIPS
    // requires `do` or at least one action after the range
    // (LoopForCountParse, core/prcdrpsr.c).
    loop_for_count_expression: $ => seq(
      '(', 'loop-for-count',
      choice($._expression, $.loop_for_count_binding),
      choice(seq('do', repeat($.action)), repeat1($.action)),
      ')'
    ),
    loop_for_count_binding: $ => seq('(', $.single_field_variable, $._expression, optional($._expression), ')'),

    // New. The file spec starts with an expression (usually a string), so
    // as a generic call every with-open-file was an error.
    with_open_file_expression: $ => seq(
      '(', 'with-open-file',
      $.file_specification,
      repeat($.action),
      ')'
    ),
    file_specification: $ => seq('(', $._expression, $._expression, optional($._expression), ')'),
    fact_query: $ => prec(1, choice($.any_factp_expression, $.find_fact_expression, $.find_all_facts_expression, $.do_for_fact_expression, $.do_for_all_facts_expression, $.delayed_do_for_all_facts_expression)),
    // New: the instance-set query functions, mirroring fact_query.
    instance_query: $ => prec(1, choice($.any_instancep_expression, $.find_instance_expression, $.find_all_instances_expression, $.do_for_instance_expression, $.do_for_all_instances_expression, $.delayed_do_for_all_instances_expression)),

    any_instancep_expression: $ => seq('(', 'any-instancep', $.instance_set_template, $.query, ')'),
    find_instance_expression: $ => seq('(', 'find-instance', $.instance_set_template, $.query, ')'),
    find_all_instances_expression: $ => seq('(', 'find-all-instances', $.instance_set_template, $.query, ')'),
    do_for_instance_expression: $ => seq('(', 'do-for-instance', $.instance_set_template, $.query, repeat($.action), ')'),
    do_for_all_instances_expression: $ => seq('(', 'do-for-all-instances', $.instance_set_template, $.query, repeat($.action), ')'),
    delayed_do_for_all_instances_expression: $ => seq('(', 'delayed-do-for-all-instances', $.instance_set_template, $.query, repeat($.action), ')'),

    instance_set_template: $ => seq('(', repeat1($.instance_set_member_template), ')'),
    // Class restrictions may be expressions, as for facts below.
    instance_set_member_template: $ => seq('(', $.single_field_variable, repeat1(choice($._class_name, $.variable, $.function_call)), ')'),
    any_factp_expression: $ => seq(
  '(',
  'any-factp',
  $.fact_set_template,
  $.query,
  ')'
    ),
	find_fact_expression: $ => seq(
  '(',
  'find-fact',
  $.fact_set_template,
  $.query,
  ')'
),

find_all_facts_expression: $ => seq(
  '(',
  'find-all-facts',
  $.fact_set_template,
  $.query,
  ')'
),

do_for_fact_expression: $ => seq(
  '(',
  'do-for-fact',
  $.fact_set_template,
  $.query,
  repeat($.action),
  ')'
),

do_for_all_facts_expression: $ => seq(
  '(',
  'do-for-all-facts',
  $.fact_set_template,
  $.query,
  repeat($.action),
  ')'
),

delayed_do_for_all_facts_expression: $ => seq(
  '(',
  'delayed-do-for-all-facts',
  $.fact_set_template,
  $.query,
  repeat($.action),
  ')'
),

    query: $ => choice($._expression ),
    fact_set_template: $ => seq('(', repeat1($.fact_set_member_template), ')'),

    fact_set_member_template: $ => seq('(', $._fact_set_member_variable, $._deftemplate_restrictions, ')'),

    _fact_set_member_variable: $ => $.single_field_variable,

    _deftemplate_restrictions: $ => repeat1($._deftemplate_name_expression),
    // Old: a name only. CLIPS evaluates any expression here, ((?f ?t))
    // ((?f (sym-cat a b))) (ParseQueryRestrictions, core/factqpsr.c).
    _deftemplate_name_expression: $ => choice($._deftemplate_name, $.variable, $.function_call),

    _expression: $ => choice($.constant, $.variable, $.function_call),
    _integer_expression: $ => $._expression,
    _instance_name_expression: $ => $._expression,
    _class_name_expression: $ => $._expression,
    _slot_name_expression: $ => $._expression,
    action: $ => $._expression,

    construct: $ => choice($.deffacts_construct, $.defglobal_construct, $.defrule_construct, $.deftemplate_construct ,$.deffunction_construct, $.defgeneric_construct, $.defmethod_construct, $.defclass_construct, $.definstances_construct, $.defmessage_handler_construct, $.defmodule_construct),
    // Old: one '(defglobal' token, so "( defglobal" was not recognized.
    defglobal_construct: $ => seq(
      '(', 'defglobal',
      optional($.name),
      repeat($.global_assignment),
      ')'
    ),

    _deffacts_name: $ => $.name,
    defrule_construct: $ => seq('(', 'defrule', $._rule_name, $.defrule_body, ')'),
	// Old: any CEs in any order. CLIPS requires logical CEs first
	// ([RULEPSR1]). A later (logical stays a keyword and starts
	// _misplaced_logical_CE, which can't complete; otherwise it would parse
	// as a pattern named `logical` without an error.
	defrule_body: $ => seq(
	  optional($.comment),
	  optional($.declaration),
	  repeat(alias($._logical_conditional_element, $.conditional_element)),
	  repeat(alias($._later_conditional_element, $.conditional_element)),
	  '=>',
	  repeat($.action)
	),
	_logical_conditional_element: $ => $.logical_CE,
	_later_conditional_element: $ => choice(
	  $.pattern_CE, $.assigned_pattern_CE, $.not_CE, $.and_CE, $.or_CE,
	  $.test_CE, $.exists_CE, $.forall_CE, $._misplaced_logical_CE
	),
	_misplaced_logical_CE: $ => seq('(', 'logical', $._variable_symbol),
    // Old: $.symbol, which didn't allow MAIN::facts.
    deffacts_construct: $ => seq('(','deffacts', $._deffacts_name, optional($.comment), repeat($.deffacts_body), ')'),
	deffacts_body: $ => $.RHS_pattern,

    deftemplate_construct: $ => seq('(','deftemplate', $._deftemplate_name, optional($.comment), repeat($.slot_definition), ')'),
    slot_definition: $ => choice($.single_slot_definition, $.multislot_definition),
    // Added field/multifield, synonyms CLIPS accepts (ParseSlot,
    // core/tmpltpsr.c).
    single_slot_definition: $ => seq('(', choice('slot', 'field'), $._slot_name, repeat($.template_attribute), ')'),
    multislot_definition: $ => seq('(', choice('multislot', 'multifield'), $._slot_name, repeat($.template_attribute), ')'),
    template_attribute: $ => choice($.default_attribute, $.constraint_attribute),


    default_attribute: $ => choice(
      seq('(','default', optional(choice('?DERIVE', '?NONE', repeat1($._expression))), ')'),
      seq('(','default-dynamic', repeat($._expression), ')')
    ),

    // Unchanged: ordered_RHS_pattern still wins, so slots of a template
    // fact parse as calls. (cheese (name "x")) and (total (+ 1 2)) have the
    // same tokens; CLIPS decides by whether a deftemplate of that name
    // exists, which a context-free grammar can't know. The language server
    // does that lookup instead.
    template_RHS_pattern: $ => prec(1, seq('(', $._fact_name, repeat1($.RHS_slot), ')')),
    ordered_RHS_pattern: $ => prec(2,seq('(', $._fact_name, repeat($.RHS_field), ')')),

    // New. A slot named like a special form, (rule (if a) (then b)), failed
    // because `if` started an if statement. This second reading treats
    // every group as a plain (name value...) group; the normal reading wins
    // when both parse. Both produce the same nodes.
    _plain_RHS_pattern: $ => prec.dynamic(-1, seq('(', $._plain_fact_name, repeat(alias($._plain_RHS_field, $.RHS_field)), ')')),
    _plain_fact_name: $ => $.name,
    _plain_RHS_field: $ => choice($.variable, $.constant, alias($._plain_call, $.function_call), seq('=', $.function_call)),


    RHS_slot: $ => prec(1,choice($.single_field_RHS_slot, $.multifield_RHS_slot)),
    // Added =(call): (depth =(+ 1 ?n)) parsed as two fields, `=` and a call.
    RHS_field: $ => prec(2,choice($.variable, $.constant, $.function_call, seq('=', $.function_call))),
    RHS_pattern: $ => choice($.template_RHS_pattern, $.ordered_RHS_pattern, alias($._plain_RHS_pattern, $.ordered_RHS_pattern)),

    single_field_RHS_slot: $ => prec(1,seq('(', $._slot_name, $.RHS_field, ')')),

    multifield_RHS_slot: $ => seq('(', $._slot_name, repeat($.RHS_field), ')'),

    // repeat -> repeat1 here and in and/or/logical/exists/forall: CLIPS
    // rejects (declare), (and), a one-CE forall etc.
    declaration: $ => seq('(','declare', repeat1($.rule_property), ')'),

    rule_property: $ => choice(
      seq('(','salience', $._integer_expression, ')'),
      seq('(','auto-focus', $.boolean_symbol, ')')
    ),

    boolean_symbol: $ => choice('TRUE', 'FALSE'),

    conditional_element: $ => choice(
      $.pattern_CE,
      $.assigned_pattern_CE,
      $.not_CE,
      $.and_CE,
      $.or_CE,
      $.logical_CE,
      $.test_CE,
      $.exists_CE,
      $.forall_CE
    ),

    pattern_CE: $ => choice($.ordered_pattern_CE, $.template_pattern_CE, $.object_pattern_CE),

    assigned_pattern_CE: $ => prec(1, seq($.single_field_variable, '<-', $.pattern_CE)),

    not_CE: $ => seq('(','not', $.conditional_element, ')'),

    and_CE: $ => seq('(','and', repeat1($.conditional_element), ')'),

    or_CE: $ => seq('(','or', repeat1($.conditional_element), ')'),

    logical_CE: $ => seq('(','logical', repeat1($.conditional_element), ')'),

    test_CE: $ => seq('(','test', $.function_call, ')'),

    exists_CE: $ => seq('(','exists', repeat1($.conditional_element), ')'),

    forall_CE: $ => seq('(','forall', $.conditional_element, repeat1($.conditional_element), ')'),

    ordered_pattern_CE: $ => seq('(', $._fact_name, repeat($.constraint), ')'),

    template_pattern_CE: $ => seq('(', $._deftemplate_name, repeat1($.LHS_slot), ')'),

    object_pattern_CE: $ => seq('(','object', repeat($.attribute_constraint), ')'),

	    attribute_constraint: $ => choice(
      seq('(','is-a', $.constraint, ')'),
      seq('(','name', $.constraint, ')'),
      seq('(', $._slot_name, repeat($.constraint), ')')
    ),


    constraint: $ => prec(4,choice('?', '$?', $.connected_constraint)),

    connected_constraint: $ => choice(
      $.single_constraint,
      seq($.single_constraint, '&', $.connected_constraint),
      seq($.single_constraint, '|', $.connected_constraint)
    ),

    single_constraint: $ => choice($.term, seq('~', $.term)),

    term: $ => choice(
      $.constant,
      $.single_field_variable,
      $.multifield_variable,
      seq(':', $.function_call),
      seq('=', $.function_call)
    ),
    LHS_slot: $ => choice($.single_field_LHS_slot, $.multifield_LHS_slot),

    single_field_LHS_slot: $ => prec(2,seq('(', $._slot_name, $.constraint, ')')),

    multifield_LHS_slot: $ => prec(1,seq('(', $._slot_name, repeat($.constraint), ')')),



    deffunction_construct: $ => seq(
      '(','deffunction',
      $.name,
      optional($.comment),
      seq('(', repeat($.regular_parameter), optional($.wildcard_parameter), ')'),
      repeat($.action),
      ')'
    ),

    regular_parameter: $ => $.single_field_variable,

    wildcard_parameter: $ => $.multifield_variable,

    defgeneric_construct: $ => seq(
      '(','defgeneric',
      $.name,
      optional($.comment),
      ')'
    ),

    defmethod_construct: $ => seq(
      '(','defmethod',
      $.name,
      optional($._index),
      optional($.comment),
      seq('(', repeat($.parameter_restriction), optional($.wildcard_parameter_restriction), ')'),
      repeat($.action),
      ')'
    ),

    // Old: types and query both optional, allowing (?x). CLIPS rejects that
    // ([GENRCPSR13]); an unrestricted parameter is written ?x.
    parameter_restriction: $ => choice(
      $.single_field_variable,
      seq('(', $.single_field_variable, $._restriction, ')')
    ),

    wildcard_parameter_restriction: $ => choice(
      $.multifield_variable,
      seq('(', $.multifield_variable, $._restriction, ')')
    ),

    _restriction: $ => choice(seq(repeat1($._type), optional($.other_query)), $.other_query),

    _type: $ => $._class_name,

    other_query: $ => choice($.global_variable, $.function_call),

    // Old: is-a allowed no superclass, and role, pattern-match, slots and
    // handlers had to come in that order. CLIPS reads them in any order,
    // role and pattern-match at most once each (ParseDefclass,
    // core/classpsr.c).
    defclass_construct: $ => seq(
      '(','defclass',
      $.name,
      optional($.comment),
      seq('(','is-a', repeat1($._superclass_name), ')'),
      optional($._class_items),
      optional(choice(
        seq($.role, optional($._class_items), optional(seq($.pattern_match_role, optional($._class_items)))),
        seq($.pattern_match_role, optional($._class_items), optional(seq($.role, optional($._class_items))))
      )),
      ')'
    ),
    _class_items: $ => repeat1(choice($.slot, $.handler_documentation)),

    role: $ => seq('(','role', choice('concrete', 'abstract'), ')'),

    pattern_match_role: $ => seq('(','pattern-match', choice('reactive', 'non-reactive'), ')'),

    // Removed single-slot: CLIPS 6.40 dropped it from defclass.
    slot: $ => choice(
      seq('(','slot', $.name, repeat($.facet), ')'),
      seq('(','multislot', $.name, repeat($.facet), ')')
    ),

    facet: $ => choice(
      $.default_facet,
      $.storage_facet,
      $.access_facet,
      $.propagation_facet,
      $.source_facet,
      $.pattern_match_facet,
      $.visibility_facet,
      $.create_accessor_facet,
      $.override_message_facet,
      $.constraint_attribute
    ),

    // Added default-dynamic. Without it the lexer split it into `default`
    // and `-dynamic`, a static default.
    default_facet: $ => choice(
      seq('(','default', choice('?DERIVE', '?NONE', repeat($._expression)), ')'),
      seq('(','default-dynamic', repeat($._expression), ')')
    ),

    storage_facet: $ => seq('(','storage', choice('local', 'shared'), ')'),

    access_facet: $ => seq('(','access', choice('read-write', 'read-only', 'initialize-only'), ')'),

    propagation_facet: $ => seq('(','propagation', choice('inherit', 'no-inherit'), ')'),

    source_facet: $ => seq('(','source', choice('exclusive', 'composite'), ')'),

    pattern_match_facet: $ => seq('(','pattern-match', choice('reactive', 'non-reactive'), ')'),

    visibility_facet: $ => seq('(','visibility', choice('private', 'public'), ')'),

    create_accessor_facet: $ => seq('(','create-accessor', choice('?NONE', 'read', 'write', 'read-write'), ')'),

    override_message_facet: $ => seq('(','override-message', choice('?DEFAULT', $._message_name), ')'),

    handler_documentation: $ => seq('(','message-handler', $.name, optional($.handler_type), ')'),

    handler_type: $ => choice('primary', 'around', 'before', 'after'),

    defmessage_handler_construct: $ => seq(
      '(','defmessage-handler',
      $._class_name,
      $._message_name,
      optional($.handler_type),
      optional($.comment),
      seq('(', repeat($.parameter), optional($.wildcard_parameter), ')'),
      repeat($.action),
      ')'
    ),
	parameter: $ => $.single_field_variable,

    wildcard_parameter: $ => $.multifield_variable,

    definstances_construct: $ => seq(
      '(','definstances',
      $._definstances_name,
      optional('active'),
      optional($.comment),
      repeat($.instance_template),
      ')'
    ),

    instance_template: $ => seq('(', $.instance_definition, ')'),

    // Name optional now: (make-instance of Dog) generates one.
    instance_definition: $ => seq(
      optional($._instance_name_expression),
      'of',
      $._class_name_expression,
      repeat($.slot_override)
    ),

    slot_override: $ => seq(
      '(',
      $._slot_name_expression,
      repeat($._expression),
      ')'
    ),

    defmodule_construct: $ => seq(
      '(','defmodule',
      $._module_name,
      optional($.comment),
      repeat($.port_specification),
      ')'
    ),

    port_specification: $ => choice(
      seq('(','export', $.port_item, ')'),
      seq('(','import', $._module_name, $.port_item, ')')
    ),

    // repeat -> repeat1: (export deftemplate) without names is an error.
    port_item: $ => choice(
      '?ALL',
      '?NONE',
      seq($.port_construct, '?ALL'),
      seq($.port_construct, '?NONE'),
      seq($.port_construct, repeat1($._construct_name))
    ),

    port_construct: $ => choice('deftemplate', 'defclass', 'defglobal', 'deffunction', 'defgeneric'),

    constraint_attribute: $ => choice(
      $.type_attribute,
      $.allowed_constant_attribute,
      $.range_attribute,
      $.cardinality_attribute
    ),

    type_attribute: $ => seq('(','type', $.type_specification, ')'),

    type_specification: $ => choice(
      repeat1($.allowed_type),
      '?VARIABLE'
    ),

    allowed_type: $ => choice(
      'SYMBOL',
      'STRING',
      'LEXEME',
      'INTEGER',
      'FLOAT',
      'NUMBER',
      'INSTANCE-NAME',
      'INSTANCE-ADDRESS',
      'INSTANCE',
      'EXTERNAL-ADDRESS',
      'FACT-ADDRESS'
    ),

    allowed_constant_attribute: $ => choice(
      seq('(','allowed-symbols', $.symbol_list, ')'),
      seq('(','allowed-strings', $.string_list, ')'),
      seq('(','allowed-lexemes', $.lexeme_list, ')'),
      seq('(','allowed-integers', $.integer_list, ')'),
      seq('(','allowed-floats', $.float_list, ')'),
      seq('(','allowed-numbers', $.number_list, ')'),
      seq('(','allowed-instance-names', $.instance_name_list, ')'),
      seq('(','allowed-classes', $.class_name_list, ')'),
      seq('(','allowed-values', $.value_list, ')')
    ),

    // Old: a single value or a variable, so (allowed-symbols red green)
    // failed. Now one or more constants, or ?VARIABLE; CLIPS rejects
    // variables here. Same for range and cardinality.
    symbol_list: $ => choice('?VARIABLE', repeat1($.symbol)),

    string_list: $ => choice('?VARIABLE', repeat1($.string)),

    lexeme_list: $ => choice('?VARIABLE', repeat1($.lexeme)),

    integer_list: $ => choice('?VARIABLE', repeat1($.integer)),

    float_list: $ => choice('?VARIABLE', repeat1($.float)),

    number_list: $ => choice('?VARIABLE', repeat1($.number)),

    instance_name_list: $ => choice('?VARIABLE', repeat1($.instance_name)),

    class_name_list: $ => choice('?VARIABLE', repeat1($._class_name)),

    value_list: $ => choice('?VARIABLE', repeat1($.constant)),

    range_attribute: $ => seq('(','range', $.range_specification, $.range_specification, ')'),

    range_specification: $ => choice($.number, '?VARIABLE'),

    cardinality_attribute: $ => seq('(','cardinality', $.cardinality_specification, $.cardinality_specification, ')'),

    cardinality_specification: $ => choice($.integer, '?VARIABLE'),
  }
});
function inQueryContext($) {
  return $.has('query');
}
