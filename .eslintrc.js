
'use strict';

module.exports = {

  'extends': [ '@chromatix/chromatix' ],

  'rules': {

    // Allow additional array items to be on one-line.
    // TODO: Move to eslint-config-chromatix if eslint-config-chromatix#2 can be solved.
    'array-bracket-newline': [ 'error', { 'minItems': 3 } ],
    'array-element-newline': [ 'error', { 'minItems': 3 } ],

    // Allow non-curly block statements if they remain on a single line.
    // TODO: Consider moving to eslint-config-chromatix.
    curly: [ 'error', 'multi-line' ],

    // Allow function declarations to be used before being defined, because they're always hoisted.
    // Doesn't apply to function *expressions* (eg. const something = function() {}).
    // TODO: Move to eslint-config-chromatix.
    'no-use-before-define': [ 'error', 'nofunc' ],

    // Consistency with array-bracket-spacing, set in eslint-config-wordpress.
    // TODO: Move to eslint-config-chromatix.
    'object-curly-spacing': [ 'error', 'always' ],

    // Require js-doc everywhere, not just in function declarations.
    // TODO: Move to eslint-config-chromatix.
    'require-jsdoc': [ 'error', {
      'require': {
        FunctionDeclaration:     true,
        MethodDefinition:        true,
        ClassDeclaration:        true,
        ArrowFunctionExpression: true,
        FunctionExpression:      true
      }
    } ]

  } // Rules.
}; // Module.exports.
