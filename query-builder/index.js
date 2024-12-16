"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryBuilder = void 0;
exports.setupDatabase = setupDatabase;
exports.sql = sql;
exports.from = from;
exports.where = where;
exports.orderBy = orderBy;
exports.set = set;
exports.and = and;
exports.or = or;
exports.eq = eq;
function setupDatabase(connection) {
    const builder = new QueryBuilder();
    if ("then" in connection) {
        connection.then((value) => {
            QueryBuilder.connection = value;
        });
    }
    else {
        QueryBuilder.connection = connection;
    }
    return builder;
}
class SQL {
    constructor(strings, values) {
        this.strings = strings;
        this.values = values;
    }
    toSqlString() {
        let finalQuery = "";
        let finalValues = [];
        for (let i = 0; i < this.values.length; i++) {
            const value = this.values[i];
            const str = this.strings[i];
            if (value instanceof SQL) {
                const { query, values } = value.toSqlString();
                finalQuery += `${str}${query}`;
                finalValues.push(...values);
                continue;
            }
            finalQuery += `${str} ?`;
            finalValues.push(value);
        }
        // @ts-ignore
        finalQuery += this.strings.at(-1) ?? "";
        return { query: finalQuery, values: finalValues };
    }
}
function isTemplateLitteral(strings, ...values) {
    return !!(strings &&
        strings.length > 0 &&
        strings.raw &&
        strings.raw.length === strings.length &&
        Object.isFrozen(strings) &&
        values.length + 1 === strings.length);
}
function sql(strings, ...values) {
    if (!isTemplateLitteral(strings, ...values)) {
        throw new Error("Incorrect template litteral call");
    }
    return new SQL(strings, values);
}
function from(params) {
    return [`from ${params}`];
}
function where(params) {
    if (Array.isArray(params)) {
        return [
            `where ${params[0]}`,
            Array.isArray(params[1]) ? params[1] : [params[1]],
        ];
    }
    if ("toSqlString" in params) {
        const result = params.toSqlString();
        return [`where ${result.query}`, [...result.values]];
    }
    throw new Error("Invalid statement");
}
function orderBy(params) {
    return [
        `order by ${Object.entries(params)
            .map(([key, value]) => {
            return `${key} ${value === 1 ? "ASC" : "DESC"}`;
        })
            .join(",")}`,
    ];
}
function set(params) {
    const sql = [];
    const values = [];
    for (const [key, val] of Object.entries(params)) {
        if (val instanceof SQL) {
            const result = val.toSqlString();
            sql.push(`${key}=${result.query}`);
            values.push(...result.values);
        }
        else {
            sql.push(`${key}=?`);
            values.push(val);
        }
    }
    // const sql = `set ${Object.entries(params)
    //   .map(([key, val]) => {
    //     if (val instanceof SQL) {
    //       console.log(val.toSqlString());
    //     }
    //     return `${key}=${val instanceof SQL ? val.toSqlString() : "?"}`;
    //   })
    //   .join(",")}`;
    // const values = Object.values(params).filter((val) => {
    //   return !(val instanceof SQL);
    // }) as Primitive[];
    return ["set " + sql.join(","), values];
}
function and(...params) {
    const statement = "(" + params.map((p) => p[0]).join(" and ") + ")";
    const values = params.flatMap((p) => p[1]);
    return [statement, values];
}
function or(...params) {
    const statement = "(" + params.map((p) => p[0]).join(" or ") + ")";
    const values = params.flatMap((p) => p[1]);
    return [statement, values];
}
function eq(key, value) {
    return [`${key}=?`, value];
}
class QueryBuilder {
    constructor() {
        this.connection = QueryBuilder.connection;
    }
    // constructor(connection: Connection) {
    //   this.connection = connection;
    // }
    select(fields) {
        let resolveFn;
        let rejectFn;
        const promise = new Promise((resolve, reject) => {
            resolveFn = resolve;
            rejectFn = reject;
        });
        let sql = [`select ${fields.join(",")}`];
        let values = [];
        return {
            from: (table) => {
                sql.push(...from(table));
                promise.where = (params) => {
                    const w = where(params);
                    sql.push(w[0]);
                    values.push(...w[1]);
                    return promise;
                };
                promise.orderBy = (params) => {
                    const order = orderBy(params);
                    sql.push(order[0]);
                    return promise;
                };
                process.nextTick(async () => {
                    try {
                        const result = await QueryBuilder.connection.execute(sql.join(" "), values);
                        resolveFn(result);
                    }
                    catch (error) {
                        rejectFn(error);
                    }
                });
                return promise;
            },
        };
    }
    insert(table) {
        return {
            values: (data) => {
                let columns;
                let valuePlaceholder;
                let values;
                if (Array.isArray(data)) {
                    columns = Object.keys(data[0]);
                    valuePlaceholder = data
                        .map(() => columns.map(() => "?").join(","))
                        .join("),(");
                    values = data.flatMap((row) => Object.values(row));
                }
                else {
                    columns = Object.keys(data);
                    values = Object.values(data);
                    valuePlaceholder = values.map(() => "?").join(",");
                }
                console.log("this", this);
                return QueryBuilder.connection.execute(`insert into ${table} (${columns.join(",")}) values (${valuePlaceholder})`, values);
            },
        };
    }
    update(table) {
        let resolveFn;
        let rejectFn;
        const promise = new Promise((resolve, reject) => {
            resolveFn = resolve;
            rejectFn = reject;
        });
        let sql = [`update ${table}`];
        let values = [];
        promise.set = (params) => {
            const s = set(params);
            sql.push(s[0]);
            values.push(...s[1]);
            return promise;
        };
        promise.where = (params) => {
            const w = where(params);
            sql.push(w[0]);
            values.push(...w[1]);
            return promise;
        };
        process.nextTick(async () => {
            try {
                const result = await QueryBuilder.connection.execute(sql.join(" "), values);
                resolveFn(result);
            }
            catch (error) {
                rejectFn(error);
            }
        });
        return promise;
    }
}
exports.QueryBuilder = QueryBuilder;
