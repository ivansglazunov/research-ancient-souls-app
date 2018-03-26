import * as _ from 'lodash';
import { assert } from 'chai';
import { Node } from 'ancient-mixins/lib/node';

type TKey = string; // /^[A-Za-z0-9]+$/i
type TField = TKey|'@rid'|'@version';

/**
 * @example
 * 
 * { field: 'name', as: 'alias' }
 */
interface IProjection {
  field?: TField;
  let?: TKey;
  as?: TKey;
  expand?: boolean;
}

/**
 * @example
 * 
 * { a: { from: 'Class' } }
 */
interface ILet {
  [name: string]: ISelect;
}

type TCondition = ILogical | IClassicOperator;

/**
 * @example
 * 
 * { logic: 'or', values: [] }
 */
interface ILogical {
  logic: 'and' | 'or' | 'not';
  values: TCondition[];
}

/**
 * @example
 * 
 * { let: 'a' }
 * { field: 'a' }
 */
interface IItem {
  let?: TKey;
  field?: TKey;
  expand?: boolean;
}

/**
 * @example
 * 
 * { left: { let: 'a' }, operator: '=', right: { field: '@rid' } }
 */
interface IClassicOperator {
  left: IItem;
  right: IItem;
  operator: '=' | '>' | '>=' | '<' | '<=' | '<>';
}

/**
 * @example
 * 
 * {
 *   select: [{ field: '@rid' }],
 *   from: 'Class',
 * }
 */
interface ISelect {
  select?: IProjection[];
  from: TKey;
  let?: ILet;
  where?: ILogical;
}

class Language extends Node {
  buildSelect(select: ISelect) {
    return this.compileSelect(this.parseSelect(select));
  }

  parseSelect(select: ISelect) {
    return {
      select: this.buildProjections(select),
      from: this.buildFrom(select),
      let: this.buildLet(select),
      where: this.buildWhere(select),
    };
  }
  compileSelect(select: any) {
    let result = 'select';
    if (select.select) result += ` ${select.select}`;
    result += ` from ${select.from}`;
    if (select.let) result += ` let ${select.let}`;
    if (select.where) result += ` where ${select.where}`;
    return result;
  }

  buildProjections(select: ISelect) {
    if (_.isArray(select.select)) {
      return _.map(select.select, p => this.buildProjection(select, p)).join(' ,');
    }
    return false;
  }
  buildProjection(select: ISelect, p: IProjection) {
    let result = p.field || this.getLet(p.let);
    if (p.expand) result = `expand(${result})`;
    if (_.has(p, 'as')) result += ` as ${p.as}`;
    return result;
  }

  buildFrom(select) {
    return select.from;
  }

  getLet(letName) {
    return `$_${letName}`;
  }

  buildLet(select: ISelect) {
    if (_.isObject(select.let)) {
      let result = '';
      _.each(select.let, (v,k) => {
        result += `${this.getLet(k)} = (${this.buildSelect(v)})`;
      });
      return result;
    }
    return false;
  }

  buildWhere(select: ISelect) {
    if (select.where) return this.buildLogical(select, select.where);
  }

  buildLogical(select: ISelect, logical: ILogical, parent?: ILogical) {
    let type;
    if (logical.logic) type = logical.logic;
    else type = 'and';

    const results = [];
    _.each(logical.values, (v) => {
      const condition = this.buildCondition(select, logical, v);
      if (condition) results.push(`(${condition})`);
    });
    return results.join(` ${type} `);
  }

  buildCondition(select: ISelect, logical: ILogical, condition: any) {
    if (condition.logic) return this.buildLogical(select, condition, logical);
    if (condition.operator) return this.buildOperator(select, logical, condition);
  }

  buildOperator(select: ISelect, logical: ILogical, operator: IClassicOperator) {
    const oLeft = operator.left;
    const condition = operator.operator;
    const oRight = operator.right;

    const dLeft = oLeft.let ? this.getLet(oLeft.let) : oLeft.field;
    const dRight = oRight.let ? this.getLet(oRight.let) : oRight.field;

    const left = oLeft.expand ? `expand(${dLeft})` : dLeft;
    const right = oRight.expand ? `expand(${dRight})` : dRight;

    return `${left} ${condition} ${right}`;
  }
}

class RestrictedLanguage extends Language {
  
}

const result = new RestrictedLanguage().buildSelect({
  select: [{ let: 'a', as: 'b', expand: true }],
  from: 'Nodes',
  let: {
    a: { select: [{ field: 'in' }], from: 'Rights' },
  },
  where: {
    logic: 'and',
    values: [
      { left: { let: 'a' }, operator: '=', right: { field: '@rid' } },
    ],
  },
});

console.log(result);
