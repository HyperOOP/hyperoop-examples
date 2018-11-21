(function () {
  'use strict';

  /*! *****************************************************************************
  Copyright (c) Microsoft Corporation. All rights reserved.
  Licensed under the Apache License, Version 2.0 (the "License"); you may not use
  this file except in compliance with the License. You may obtain a copy of the
  License at http://www.apache.org/licenses/LICENSE-2.0

  THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
  WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
  MERCHANTABLITY OR NON-INFRINGEMENT.

  See the Apache Version 2.0 License for specific language governing permissions
  and limitations under the License.
  ***************************************************************************** */
  /* global Reflect, Promise */

  var extendStatics = function(d, b) {
      extendStatics = Object.setPrototypeOf ||
          ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
          function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
      return extendStatics(d, b);
  };

  function __extends(d, b) {
      extendStatics(d, b);
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  }

  var __assign = function() {
      __assign = Object.assign || function __assign(t) {
          for (var s, i = 1, n = arguments.length; i < n; i++) {
              s = arguments[i];
              for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
          }
          return t;
      };
      return __assign.apply(this, arguments);
  };

  function h(name, attributes) {
    var rest = [];
    var children = [];
    var length = arguments.length;

    while (length-- > 2) rest.push(arguments[length]);

    while (rest.length) {
      var node = rest.pop();
      if (node && node.pop) {
        for (length = node.length; length--; ) {
          rest.push(node[length]);
        }
      } else if (node != null && node !== true && node !== false) {
        children.push(node);
      }
    }

    return typeof name === "function"
      ? name(attributes || {}, children)
      : {
          nodeName: name,
          attributes: attributes || {},
          children: children,
          key: attributes && attributes.key
        }
  }

  function app(state, actions, view, container) {
    var map = [].map;
    var rootElement = (container && container.children[0]) || null;
    var oldNode = rootElement && recycleElement(rootElement);
    var lifecycle = [];
    var skipRender;
    var isRecycling = true;
    var globalState = clone(state);
    var wiredActions = wireStateToActions([], globalState, clone(actions));

    scheduleRender();

    return wiredActions

    function recycleElement(element) {
      return {
        nodeName: element.nodeName.toLowerCase(),
        attributes: {},
        children: map.call(element.childNodes, function(element) {
          return element.nodeType === 3 // Node.TEXT_NODE
            ? element.nodeValue
            : recycleElement(element)
        })
      }
    }

    function resolveNode(node) {
      return typeof node === "function"
        ? resolveNode(node(globalState, wiredActions))
        : node != null
          ? node
          : ""
    }

    function render() {
      skipRender = !skipRender;

      var node = resolveNode(view);

      if (container && !skipRender) {
        rootElement = patch(container, rootElement, oldNode, (oldNode = node));
      }

      isRecycling = false;

      while (lifecycle.length) lifecycle.pop()();
    }

    function scheduleRender() {
      if (!skipRender) {
        skipRender = true;
        setTimeout(render);
      }
    }

    function clone(target, source) {
      var out = {};

      for (var i in target) out[i] = target[i];
      for (var i in source) out[i] = source[i];

      return out
    }

    function setPartialState(path, value, source) {
      var target = {};
      if (path.length) {
        target[path[0]] =
          path.length > 1
            ? setPartialState(path.slice(1), value, source[path[0]])
            : value;
        return clone(source, target)
      }
      return value
    }

    function getPartialState(path, source) {
      var i = 0;
      while (i < path.length) {
        source = source[path[i++]];
      }
      return source
    }

    function wireStateToActions(path, state, actions) {
      for (var key in actions) {
        typeof actions[key] === "function"
          ? (function(key, action) {
              actions[key] = function(data) {
                var result = action(data);

                if (typeof result === "function") {
                  result = result(getPartialState(path, globalState), actions);
                }

                if (
                  result &&
                  result !== (state = getPartialState(path, globalState)) &&
                  !result.then // !isPromise
                ) {
                  scheduleRender(
                    (globalState = setPartialState(
                      path,
                      clone(state, result),
                      globalState
                    ))
                  );
                }

                return result
              };
            })(key, actions[key])
          : wireStateToActions(
              path.concat(key),
              (state[key] = clone(state[key])),
              (actions[key] = clone(actions[key]))
            );
      }

      return actions
    }

    function getKey(node) {
      return node ? node.key : null
    }

    function eventListener(event) {
      return event.currentTarget.events[event.type](event)
    }

    function updateAttribute(element, name, value, oldValue, isSvg) {
      if (name === "key") ; else if (name === "style") {
        if (typeof value === "string") {
          element.style.cssText = value;
        } else {
          if (typeof oldValue === "string") oldValue = element.style.cssText = "";
          for (var i in clone(oldValue, value)) {
            var style = value == null || value[i] == null ? "" : value[i];
            if (i[0] === "-") {
              element.style.setProperty(i, style);
            } else {
              element.style[i] = style;
            }
          }
        }
      } else {
        if (name[0] === "o" && name[1] === "n") {
          name = name.slice(2);

          if (element.events) {
            if (!oldValue) oldValue = element.events[name];
          } else {
            element.events = {};
          }

          element.events[name] = value;

          if (value) {
            if (!oldValue) {
              element.addEventListener(name, eventListener);
            }
          } else {
            element.removeEventListener(name, eventListener);
          }
        } else if (
          name in element &&
          name !== "list" &&
          name !== "type" &&
          name !== "draggable" &&
          name !== "spellcheck" &&
          name !== "translate" &&
          !isSvg
        ) {
          element[name] = value == null ? "" : value;
        } else if (value != null && value !== false) {
          element.setAttribute(name, value);
        }

        if (value == null || value === false) {
          element.removeAttribute(name);
        }
      }
    }

    function createElement(node, isSvg) {
      var element =
        typeof node === "string" || typeof node === "number"
          ? document.createTextNode(node)
          : (isSvg = isSvg || node.nodeName === "svg")
            ? document.createElementNS(
                "http://www.w3.org/2000/svg",
                node.nodeName
              )
            : document.createElement(node.nodeName);

      var attributes = node.attributes;
      if (attributes) {
        if (attributes.oncreate) {
          lifecycle.push(function() {
            attributes.oncreate(element);
          });
        }

        for (var i = 0; i < node.children.length; i++) {
          element.appendChild(
            createElement(
              (node.children[i] = resolveNode(node.children[i])),
              isSvg
            )
          );
        }

        for (var name in attributes) {
          updateAttribute(element, name, attributes[name], null, isSvg);
        }
      }

      return element
    }

    function updateElement(element, oldAttributes, attributes, isSvg) {
      for (var name in clone(oldAttributes, attributes)) {
        if (
          attributes[name] !==
          (name === "value" || name === "checked"
            ? element[name]
            : oldAttributes[name])
        ) {
          updateAttribute(
            element,
            name,
            attributes[name],
            oldAttributes[name],
            isSvg
          );
        }
      }

      var cb = isRecycling ? attributes.oncreate : attributes.onupdate;
      if (cb) {
        lifecycle.push(function() {
          cb(element, oldAttributes);
        });
      }
    }

    function removeChildren(element, node) {
      var attributes = node.attributes;
      if (attributes) {
        for (var i = 0; i < node.children.length; i++) {
          removeChildren(element.childNodes[i], node.children[i]);
        }

        if (attributes.ondestroy) {
          attributes.ondestroy(element);
        }
      }
      return element
    }

    function removeElement(parent, element, node) {
      function done() {
        parent.removeChild(removeChildren(element, node));
      }

      var cb = node.attributes && node.attributes.onremove;
      if (cb) {
        cb(element, done);
      } else {
        done();
      }
    }

    function patch(parent, element, oldNode, node, isSvg) {
      if (node === oldNode) ; else if (oldNode == null || oldNode.nodeName !== node.nodeName) {
        var newElement = createElement(node, isSvg);
        parent.insertBefore(newElement, element);

        if (oldNode != null) {
          removeElement(parent, element, oldNode);
        }

        element = newElement;
      } else if (oldNode.nodeName == null) {
        element.nodeValue = node;
      } else {
        updateElement(
          element,
          oldNode.attributes,
          node.attributes,
          (isSvg = isSvg || node.nodeName === "svg")
        );

        var oldKeyed = {};
        var newKeyed = {};
        var oldElements = [];
        var oldChildren = oldNode.children;
        var children = node.children;

        for (var i = 0; i < oldChildren.length; i++) {
          oldElements[i] = element.childNodes[i];

          var oldKey = getKey(oldChildren[i]);
          if (oldKey != null) {
            oldKeyed[oldKey] = [oldElements[i], oldChildren[i]];
          }
        }

        var i = 0;
        var k = 0;

        while (k < children.length) {
          var oldKey = getKey(oldChildren[i]);
          var newKey = getKey((children[k] = resolveNode(children[k])));

          if (newKeyed[oldKey]) {
            i++;
            continue
          }

          if (newKey != null && newKey === getKey(oldChildren[i + 1])) {
            if (oldKey == null) {
              removeElement(element, oldElements[i], oldChildren[i]);
            }
            i++;
            continue
          }

          if (newKey == null || isRecycling) {
            if (oldKey == null) {
              patch(element, oldElements[i], oldChildren[i], children[k], isSvg);
              k++;
            }
            i++;
          } else {
            var keyedNode = oldKeyed[newKey] || [];

            if (oldKey === newKey) {
              patch(element, keyedNode[0], keyedNode[1], children[k], isSvg);
              i++;
            } else if (keyedNode[0]) {
              patch(
                element,
                element.insertBefore(keyedNode[0], oldElements[i]),
                keyedNode[1],
                children[k],
                isSvg
              );
            } else {
              patch(element, oldElements[i], null, children[k], isSvg);
            }

            newKeyed[newKey] = children[k];
            k++;
          }
        }

        while (i < oldChildren.length) {
          if (getKey(oldChildren[i]) == null) {
            removeElement(element, oldElements[i], oldChildren[i]);
          }
          i++;
        }

        for (var i in oldKeyed) {
          if (!newKeyed[i]) {
            removeElement(element, oldKeyed[i][0], oldKeyed[i][1]);
          }
        }
      }
      return element
    }
  }

  /**
   * Creates Proxy that calls `after` callback after set or delete entries of a `target`.
   *
   *
   * @param target target object
   * @param after callback to execute after set or delete entries of `target`
   */
  function make(target, after) {
      return new Proxy(target, {
          set: function (t, k, v) {
              if (k in t && t[k] === v) {
                  return true;
              }
              t[k] = v;
              after();
              return true;
          },
          deleteProperty: function (t, k) {
              if (k in t) {
                  delete t[k];
                  after();
              }
              return true;
          },
      });
  }
  /**
   * Creates Proxy that calls `after` callback after set or delete entries of a `target`.
   * Set or delete actions can be (re, un)done using `redoundo.Hist` argument.
   *
   * @param target target object
   * @param after callback to execute after set or delete entries of `target`
   * @param hist `redoundo.Hist` object
   */
  function makeH(target, after, hist) {
      if (!hist) {
          return null;
      }
      return new Proxy(target, {
          set: function (t, k, v) {
              var was = k in target;
              var oldVal = null;
              if (was) {
                  oldVal = target[k];
                  if (oldVal === v) {
                      return true;
                  }
              }
              var redo = function () {
                  target[k] = v;
                  after();
              };
              var undo = function () {
                  if (was) {
                      target[k] = oldVal;
                  }
                  else {
                      delete target[k];
                  }
                  after();
              };
              hist.add({ Redo: redo, Undo: undo });
              return true;
          },
          deleteProperty: function (t, k) {
              if (!(k in t)) {
                  return true;
              }
              var v = t[k];
              var redo = function () {
                  delete t[k];
                  after();
              };
              var undo = function () {
                  t[k] = v;
                  after();
              };
              hist.add({ Redo: redo, Undo: undo });
              return true;
          },
      });
  }

  var Hist = /** @class */ (function () {
      function Hist(depth) {
          this.depth_ = depth;
          this.list_ = [];
          this.offset_ = 0;
      }
      Object.defineProperty(Hist.prototype, "UndoLength", {
          get: function () { return this.list_.length - this.offset_; },
          enumerable: true,
          configurable: true
      });
      Object.defineProperty(Hist.prototype, "RedoLength", {
          get: function () { return this.offset_; },
          enumerable: true,
          configurable: true
      });
      Hist.prototype.add = function (r) {
          var lst = this.list_.slice(0, this.list_.length - this.offset_);
          if (lst.length === this.depth_) {
              lst = lst.splice(0, 1);
          }
          if (lst.length === this.depth_)
              return;
          lst.push(r);
          this.offset_ = 0;
          this.list_ = lst;
          r.Redo();
      };
      Hist.prototype.undo = function () {
          if (this.list_.length) {
              var maxOffset = this.list_.length - 1;
              if (this.offset_ <= maxOffset) {
                  this.list_[maxOffset - this.offset_].Undo();
                  this.offset_++;
              }
          }
      };
      Hist.prototype.redo = function () {
          if (this.list_.length) {
              var maxOffset = this.list_.length - 1;
              if (this.offset_ > 0) {
                  this.offset_--;
                  this.list_[maxOffset - this.offset_].Redo();
              }
          }
      };
      Hist.prototype.clean = function () {
          this.list_ = [];
          this.offset_ = 0;
      };
      return Hist;
  }());

  /** JSX factory function, creates `VNode`s */
  var h$1 = h;
  /** Creates `View` object
   *
   * @param a `Actions` object
   * @param v function that returns a VDOM tree
   */
  function view(a, v) {
      return function (spin, r) {
          if (a) {
              a.init(r);
          }
          return v();
      };
  }
  var renderer = { render: function () { return function (s) { return ({ Value: !s.Value }); }; } };
  /** initialize DOM element with a hyperoop `View`
   *
   * @param el
   * @param view
   */
  function init(el, v) {
      app({ Value: true }, __assign({}, renderer), v, el);
  }
  /** Class of hyperoop top-level action */
  var Actions = /** @class */ (function () {
      /** Construct an `Actions` object
       *
       * @param start state on start
       * @param hist `redoundo.Hist` object implements redo/undo functionality
       */
      function Actions(start, hist) {
          if (hist === void 0) { hist = null; }
          this.orig = start;
          this.History = typeof hist === "number" ? new Hist(hist) : hist;
          this.init(renderer);
      }
      Object.defineProperty(Actions.prototype, "State", {
          /** state object */
          get: function () { return this.state; },
          enumerable: true,
          configurable: true
      });
      Object.defineProperty(Actions.prototype, "Remember", {
          /** state object that remember previous states and has redo/undo functionality */
          get: function () { return this.remember; },
          enumerable: true,
          configurable: true
      });
      Object.defineProperty(Actions.prototype, "Renderer", {
          /** renderer that should be called for page re-rendering */
          get: function () { return this.renderer; },
          enumerable: true,
          configurable: true
      });
      /** Partially sets a new state
       *
       * @param s new state data
       * @param remember remember previous state using `redoundo.Hist` or not?
       */
      Actions.prototype.set = function (s, remember) {
          var _this = this;
          if (remember === void 0) { remember = false; }
          var keys;
          if (Array.isArray(s)) {
              keys = Array.from(s.keys());
          }
          else {
              keys = Object.getOwnPropertyNames(s);
          }
          keys = keys.filter(function (k) { return !(k in _this.orig) || _this.orig[k] !== s[k]; });
          var change = keys.length > 0;
          if (!change) {
              return;
          }
          var self = this;
          if (remember && this.History) {
              var was_1 = {};
              var wasnt_1 = [];
              for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
                  var k = keys_1[_i];
                  if (k in this.orig) {
                      was_1[k] = this.orig[k];
                  }
                  else {
                      wasnt_1.push(k);
                  }
              }
              this.History.add({
                  Redo: function () {
                      for (var _i = 0, keys_3 = keys; _i < keys_3.length; _i++) {
                          var k = keys_3[_i];
                          self.orig[k] = s[k];
                      }
                      self.renderer.render();
                  },
                  Undo: function () {
                      for (var k in was_1) {
                          self.orig[k] = was_1[k];
                      }
                      for (var _i = 0, wasnt_2 = wasnt_1; _i < wasnt_2.length; _i++) {
                          var k = wasnt_2[_i];
                          delete self.orig[k];
                      }
                      self.renderer.render();
                  },
              });
          }
          else {
              for (var _a = 0, keys_2 = keys; _a < keys_2.length; _a++) {
                  var k = keys_2[_a];
                  this.orig[k] = s[k];
              }
              this.renderer.render();
          }
      };
      /** Initialize `Actions` with new renderer
       *
       * @param r
       */
      Actions.prototype.init = function (r) {
          this.renderer = r;
          var self = this;
          this.state = make(this.orig, function () { return self.renderer.render(); });
          this.remember = makeH(this.orig, function () { return self.renderer.render(); }, this.History);
      };
      return Actions;
  }());
  /** Class of hyperoop sub-actions */
  var SubActions = /** @class */ (function (_super) {
      __extends(SubActions, _super);
      /** Constructs `SubActions` object inheriting `History` and `Renderer` from a parent.
       *  NOTE! If `SubActions` object created before first rendering then you will need
       *  to call it's `init` manually.
       *
       * @param start state on start
       * @param parent parent `(Sub)Actions` object.
       */
      function SubActions(start, parent) {
          var _this = _super.call(this, start, parent.History) || this;
          if (parent.Renderer) {
              _this.init({ render: function () { return parent.Renderer.render(); } });
          }
          return _this;
      }
      return SubActions;
  }(Actions));

  const Filters = {
      All: () => true,
      Done: (it) => it.State.done,
      Todo: (it) => !it.State.done,
  };
  const HistoryLength = 50;
  class Todo extends Actions {
      constructor(start) {
          super(start, HistoryLength);
      }
      get FilteredItems() {
          return this.State.todos.filter(Filters[this.State.filter]);
      }
      get UnusedFilters() {
          return Object.keys(Filters)
              .filter((key) => key !== todo.State.filter);
      }
      add() {
          const newItem = new Item({
              done: false,
              id: this.State.todos.length + 1,
              value: this.State.input,
          }, this);
          this.set({
              input: "",
              todos: [...this.State.todos, newItem],
          }, true);
      }
  }
  const todo = new Todo({
      filter: "All",
      input: "",
      placeholder: "Do that thing...",
      todos: [],
  });
  class Item extends SubActions {
  }
  const TodoItem = ({ item }) => (h$1("li", { class: item.State.done && "done", onclick: () => item.Remember.done = !item.State.done }, item.State.value));
  const FilterButton = ({ filter }) => (h$1("span", null,
      h$1("a", { href: "#", onclick: () => todo.State.filter = filter }, filter),
      " "));
  const ControlButton = ({ name, onclick }) => (h$1("span", null,
      h$1("a", { href: "#", onclick: onclick }, name),
      " "));
  const view$1 = view(todo, () => (h$1("div", null,
      h$1("h1", null, "Todo"),
      h$1("p", null,
          todo.UnusedFilters.map((key) => h$1(FilterButton, { filter: key })),
          todo.History.UndoLength > 0 ?
              h$1(ControlButton, { name: "Undo", onclick: () => todo.History.undo() })
              : "",
          todo.History.RedoLength > 0 ?
              h$1(ControlButton, { name: "Redo", onclick: () => todo.History.redo() })
              : ""),
      h$1("div", { class: "flex" },
          h$1("input", { type: "text", onkeyup: (e) => (e.keyCode === 13 ? todo.add() : ""), oninput: (e) => todo.State.input = e.target.value, value: todo.State.input, placeholder: todo.State.placeholder }),
          h$1("button", { onclick: () => todo.add() }, "\uFF0B")),
      h$1("p", null,
          h$1("ul", null,
              " ",
              todo.FilteredItems.map((t) => h$1(TodoItem, { item: t })),
              " ")))));
  init(document.body, view$1);

}());
//# sourceMappingURL=index.js.map
