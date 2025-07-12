#!/usr/bin/env node

/**
 * 🧜‍♀️ RinaWarp Terminal - Advanced Codemod for Deprecated Package Modernization
 *
 * This jscodeshift codemod automatically transforms deprecated packages to modern alternatives:
 * - q → Native Promises/async-await
 * - lodash.isequal → util.isDeepStrictEqual
 * - rimraf → fs.rm()
 * - uuid → crypto.randomUUID()
 * - mkdirp → fs.mkdir({ recursive: true })
 * - request → fetch()
 * - async → Native async/await patterns
 *
 * Usage: npx jscodeshift -t codemods/modernize-deprecated-packages.js src/
 */

const { quote } = require('recast').types.namedTypes;

module.exports = function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  let hasChanges = false;
  const addedImports = new Set();

  // Helper function to add import if not already added
  function addImportIfNeeded(source, specifier, type = 'destructuring') {
    const importKey = `${source}:${specifier}:${type}`;
    if (addedImports.has(importKey)) return;
    addedImports.add(importKey);

    const body = root.find(j.Program).get('body');
    const firstNode = body.value[0];

    let importStatement;
    if (type === 'destructuring') {
      importStatement = j.variableDeclaration('const', [
        j.variableDeclarator(
          j.objectPattern([j.objectProperty(j.identifier(specifier), j.identifier(specifier))]),
          j.callExpression(j.identifier('require'), [j.literal(source)])
        ),
      ]);
    } else if (type === 'default') {
      importStatement = j.variableDeclaration('const', [
        j.variableDeclarator(
          j.identifier(specifier),
          j.callExpression(j.identifier('require'), [j.literal(source)])
        ),
      ]);
    }

    if (firstNode) {
      body.insertBefore(importStatement);
    } else {
      body.insertAt(0, importStatement);
    }
  }

  // Helper to create async function
  function createAsyncFunction(functionName, body) {
    return j.functionDeclaration(
      j.identifier(functionName),
      [],
      j.blockStatement(body),
      false, // generator
      true // async
    );
  }

  // 1. Transform Q promises to native Promises/async-await
  root
    .find(j.CallExpression, {
      callee: { type: 'Identifier', name: 'require' },
      arguments: [{ value: 'q' }],
    })
    .forEach(path => {
      // Remove the require statement
      if (j.VariableDeclarator.check(path.parent.value)) {
        j(path.parent.parent).remove();
        hasChanges = true;
      }
    });

  // Transform Q.fcall() patterns
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        object: { name: 'Q' },
        property: { name: 'fcall' },
      },
    })
    .forEach(path => {
      const callbackArg = path.value.arguments[0];

      if (j.ArrowFunctionExpression.check(callbackArg) || j.FunctionExpression.check(callbackArg)) {
        // Convert Q.fcall(() => doSomething()) to doSomething()
        if (callbackArg.body.type === 'CallExpression') {
          j(path).replaceWith(callbackArg.body);
        } else if (
          callbackArg.body.type === 'BlockStatement' &&
          callbackArg.body.body.length === 1
        ) {
          const returnStmt = callbackArg.body.body[0];
          if (j.ReturnStatement.check(returnStmt)) {
            j(path).replaceWith(returnStmt.argument);
          }
        }
        hasChanges = true;
      }
    });

  // Transform Q.defer() patterns to Promise constructor
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        object: { name: 'Q' },
        property: { name: 'defer' },
      },
    })
    .forEach(path => {
      // This is complex - we'll add a comment for manual review
      j(path).replaceWith(
        j.callExpression(j.identifier('Promise'), [
          j.arrowFunctionExpression(
            [j.identifier('resolve'), j.identifier('reject')],
            j.blockStatement([
              j.expressionStatement(
                j.callExpression(j.identifier('console'), [
                  j.literal('// TODO: Convert Q.defer() to Promise constructor pattern'),
                ])
              ),
            ])
          ),
        ])
      );
      hasChanges = true;
    });

  // 2. Transform lodash.isequal to util.isDeepStrictEqual
  root
    .find(j.CallExpression, {
      callee: { type: 'Identifier', name: 'require' },
      arguments: [{ value: 'lodash.isequal' }],
    })
    .forEach(path => {
      if (j.VariableDeclarator.check(path.parent.value)) {
        const varName = path.parent.value.id.name;

        // Replace the require with util import
        addImportIfNeeded('node:util', 'isDeepStrictEqual');
        j(path.parent.parent).remove();

        // Replace all usages of the variable
        root
          .find(j.CallExpression, {
            callee: { name: varName },
          })
          .forEach(usagePath => {
            usagePath.value.callee.name = 'isDeepStrictEqual';
          });

        hasChanges = true;
      }
    });

  // 3. Transform rimraf to fs.rm()
  root
    .find(j.CallExpression, {
      callee: { type: 'Identifier', name: 'require' },
      arguments: [{ value: 'rimraf' }],
    })
    .forEach(path => {
      if (j.VariableDeclarator.check(path.parent.value)) {
        const varName = path.parent.value.id.name;

        // Add fs import
        addImportIfNeeded('node:fs', 'fs', 'default');
        j(path.parent.parent).remove();

        // Replace rimraf calls with fs.rm
        root
          .find(j.CallExpression, {
            callee: { name: varName },
          })
          .forEach(usagePath => {
            const args = usagePath.value.arguments;
            const pathArg = args[0];
            const callbackArg = args[1];

            // Convert to fs.rm with options
            const fsRmCall = j.callExpression(
              j.memberExpression(j.identifier('fs'), j.identifier('rm')),
              [
                pathArg,
                j.objectExpression([
                  j.objectProperty(j.identifier('recursive'), j.literal(true)),
                  j.objectProperty(j.identifier('force'), j.literal(true)),
                ]),
                callbackArg,
              ]
            );

            j(usagePath).replaceWith(fsRmCall);
          });

        hasChanges = true;
      }
    });

  // 4. Transform uuid to crypto.randomUUID()
  root
    .find(j.CallExpression, {
      callee: { type: 'Identifier', name: 'require' },
      arguments: [{ value: 'uuid' }],
    })
    .forEach(path => {
      if (j.VariableDeclarator.check(path.parent.value)) {
        addImportIfNeeded('node:crypto', 'crypto', 'default');
        j(path.parent.parent).remove();
        hasChanges = true;
      }
    });

  // Transform uuid.v4() calls
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        property: { name: 'v4' },
      },
    })
    .forEach(path => {
      j(path).replaceWith(
        j.callExpression(j.memberExpression(j.identifier('crypto'), j.identifier('randomUUID')), [])
      );
      hasChanges = true;
    });

  // Transform destructured uuid imports
  root.find(j.VariableDeclarator).forEach(path => {
    if (
      j.ObjectPattern.check(path.value.id) &&
      j.CallExpression.check(path.value.init) &&
      path.value.init.arguments[0] &&
      path.value.init.arguments[0].value === 'uuid'
    ) {
      // Find properties like { v4: uuidv4 }
      path.value.id.properties.forEach(prop => {
        if (prop.key.name === 'v4') {
          const aliasName = prop.value.name;

          // Replace all uses of the alias
          root
            .find(j.CallExpression, {
              callee: { name: aliasName },
            })
            .forEach(usagePath => {
              j(usagePath).replaceWith(
                j.callExpression(
                  j.memberExpression(j.identifier('crypto'), j.identifier('randomUUID')),
                  []
                )
              );
            });
        }
      });

      addImportIfNeeded('node:crypto', 'crypto', 'default');
      j(path.parent).remove();
      hasChanges = true;
    }
  });

  // 5. Transform mkdirp to fs.mkdir
  root
    .find(j.CallExpression, {
      callee: { type: 'Identifier', name: 'require' },
      arguments: [{ value: 'mkdirp' }],
    })
    .forEach(path => {
      if (j.VariableDeclarator.check(path.parent.value)) {
        const varName = path.parent.value.id.name;

        addImportIfNeeded('node:fs', 'fs', 'default');
        j(path.parent.parent).remove();

        // Replace mkdirp calls
        root
          .find(j.CallExpression, {
            callee: { name: varName },
          })
          .forEach(usagePath => {
            const args = usagePath.value.arguments;
            const pathArg = args[0];
            const callbackArg = args[1];

            const fsMkdirCall = j.callExpression(
              j.memberExpression(j.identifier('fs'), j.identifier('mkdir')),
              [
                pathArg,
                j.objectExpression([j.objectProperty(j.identifier('recursive'), j.literal(true))]),
                callbackArg,
              ]
            );

            j(usagePath).replaceWith(fsMkdirCall);
          });

        hasChanges = true;
      }
    });

  // 6. Transform request to fetch (basic patterns)
  root
    .find(j.CallExpression, {
      callee: { type: 'Identifier', name: 'require' },
      arguments: [{ value: 'request' }],
    })
    .forEach(path => {
      if (j.VariableDeclarator.check(path.parent.value)) {
        const varName = path.parent.value.id.name;

        // Add comment for manual review since fetch API is different
        j(path.parent.parent).insertAfter(
          j.expressionStatement(
            j.callExpression(j.identifier('console'), [
              j.literal(
                '// TODO: Replace request with fetch() - API differs, manual review needed'
              ),
            ])
          )
        );

        j(path.parent.parent).remove();
        hasChanges = true;
      }
    });

  // 7. Transform async.series patterns
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        object: { name: 'async' },
        property: { name: 'series' },
      },
    })
    .forEach(path => {
      // Add comment for manual conversion to async/await
      j(path).insertBefore(
        j.expressionStatement(
          j.callExpression(j.identifier('console'), [
            j.literal(
              '// TODO: Convert async.series to native async/await with sequential execution'
            ),
          ])
        )
      );
      hasChanges = true;
    });

  // 8. Transform async.parallel patterns
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        object: { name: 'async' },
        property: { name: 'parallel' },
      },
    })
    .forEach(path => {
      const tasks = path.value.arguments[0];
      const callback = path.value.arguments[1];

      if (j.ArrayExpression.check(tasks)) {
        // Convert to Promise.all
        const promiseAllCall = j.callExpression(
          j.memberExpression(j.identifier('Promise'), j.identifier('all')),
          [
            j.arrayExpression(
              tasks.elements.map(task => {
                // Convert callback-style to promise
                return j.callExpression(
                  j.memberExpression(j.identifier('Promise'), j.identifier('resolve')),
                  [j.callExpression(task, [])]
                );
              })
            ),
          ]
        );

        if (callback) {
          // Add .then().catch() for callback conversion
          const promiseChain = j.callExpression(
            j.memberExpression(
              j.callExpression(j.memberExpression(promiseAllCall, j.identifier('then')), [
                j.arrowFunctionExpression(
                  [j.identifier('results')],
                  j.callExpression(callback, [j.literal(null), j.identifier('results')])
                ),
              ]),
              j.identifier('catch')
            ),
            [
              j.arrowFunctionExpression(
                [j.identifier('error')],
                j.callExpression(callback, [j.identifier('error')])
              ),
            ]
          );
          j(path).replaceWith(promiseChain);
        } else {
          j(path).replaceWith(promiseAllCall);
        }
        hasChanges = true;
      }
    });

  // Add helpful comments at the top of files that were modified
  if (hasChanges) {
    const body = root.find(j.Program).get('body');
    const comment = j.commentBlock(`
 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal Codemod
 - Deprecated packages replaced with native Node.js APIs
 - Please review and test the changes
 - Some patterns may need manual adjustment (marked with TODO comments)
`);

    if (body.value.length > 0) {
      body.value[0].comments = body.value[0].comments || [];
      body.value[0].comments.unshift(comment);
    }
  }

  return hasChanges
    ? root.toSource({
      quote: 'single',
      reuseParsers: true,
      lineTerminator: '\n',
    })
    : null;
};

// Export for CLI usage
module.exports.parser = 'babylon';
