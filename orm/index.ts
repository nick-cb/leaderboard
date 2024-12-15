import { Connection } from "mysql2/promise";

type Primitive = Number | String | Date;

export async function setupDatabase(connection: Connection) {
  await connection.ping();
  const builder = new QueryBuilder(connection);
  return builder;
}

class SQL {
  constructor(
    private strings: TemplateStringsArray,
    private values: (Primitive | Primitive[] | SQL)[],
  ) {}

  toSqlString() {
    let finalQuery = "";
    let finalValues: (Primitive | Primitive[])[] = [];
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

function isTemplateLitteral(
  strings: TemplateStringsArray,
  ...values: (Primitive | Primitive[] | SQL)[]
) {
  return !!(
    strings &&
    strings.length > 0 &&
    strings.raw &&
    strings.raw.length === strings.length &&
    Object.isFrozen(strings) &&
    values.length + 1 === strings.length
  );
}

export function sql(
  strings: TemplateStringsArray,
  ...values: (Primitive | SQL | Primitive[])[]
): SQL {
  if (!isTemplateLitteral(strings, ...values)) {
    throw new Error("Incorrect template litteral call");
  }

  return new SQL(strings, values);
}

export function from(params: string) {
  return [`from ${params}`];
}

export function where(
  params: [string, Primitive[] | Primitive] | SQL,
): [string, Primitive[]] {
  if (Array.isArray(params)) {
    return [
      `where ${params[0]}`,
      Array.isArray(params[1]) ? params[1] : [params[1]],
    ];
  }
  if ("toSqlString" in params) {
    return [`where ${params.toSqlString()}`, []];
  }
  throw new Error("Invalid statement");
}

export function orderBy(params: { [k in string]: 0 | 1 }) {
  return [
    `order by ${Object.entries(params)
      .map(([key, value]) => {
        return `${key} ${value === 1 ? "ASC" : "DESC"}`;
      })
      .join(",")}`,
  ];
}

export function set(params: { [k in string]: SQL | Primitive }): [
  string,
  Primitive[],
] {
  const sql = `set ${Object.entries(params)
    .map(
      ([key, val]) => `${key}=${val instanceof SQL ? val.toSqlString() : "?"}`,
    )
    .join(",")}`;
  const values = Object.values(params).filter((val) => {
    return !(val instanceof SQL);
  }) as Primitive[];

  return [sql, values];
}

export function and(...params: Array<any>) {
  const statement = "(" + params.map((p) => p[0]).join(" and ") + ")";
  const values = params.flatMap((p) => p[1]);
  return [statement, values];
}

export function or(...params: Array<any>) {
  const statement = "(" + params.map((p) => p[0]).join(" or ") + ")";
  const values = params.flatMap((p) => p[1]);
  return [statement, values];
}

export function eq(key: string, value: Primitive) {
  return [`${key}=?`, value];
}

type Query = "set" | "where" | "orderBy";
type QueryPromise<
  T extends Query,
  R extends any = Promise<any>,
> = Promise<any> & {
  [K in T]: (params: any) => R;
};

export class QueryBuilder {
  connection: Connection;
  constructor(connection: Connection) {
    this.connection = connection;
  }

  select(fields: Array<string>) {
    let resolveFn: (value: unknown) => void;
    let rejectFn: (value: unknown) => void;
    const promise = new Promise((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    }) as QueryPromise<"where", QueryPromise<"orderBy">> &
      QueryPromise<"orderBy", Promise<any>>;

    let sql = [`select ${fields.join(",")}`];
    let values: Primitive[] = [];

    return {
      from: (table: string) => {
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
            const result = await this.connection.execute(sql.join(" "), values);
            resolveFn(result);
          } catch (error) {
            rejectFn(error);
          }
        });
        return promise;
      },
    };
  }

  insert(table: string) {
    return {
      values: (data: Object) => {
        let columns: string[];
        let valuePlaceholder: string;
        let values: Primitive[];
        if (Array.isArray(data)) {
          columns = Object.keys(data[0]);
          valuePlaceholder = data
            .map(() => columns.map(() => "?").join(","))
            .join("),(");
          values = data.flatMap((row) => Object.values(row));
        } else {
          columns = Object.keys(data);
          values = Object.values(data);
          valuePlaceholder = values.map(() => "?").join(",");
        }
        console.log("this", this);
        return this.connection.execute(
          `insert into ${table} (${columns.join(",")}) values (${valuePlaceholder})`,
          values,
        );
      },
    };
  }

  update(table: string) {
    let resolveFn: (value: unknown) => void;
    let rejectFn: (value: unknown) => void;
    const promise = new Promise((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    }) as QueryPromise<"set", QueryPromise<"where">> & QueryPromise<"where">;

    let sql = [`update ${table}`];
    let values: Primitive[] = [];

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
        const result = await this.connection.execute(sql.join(" "), values);
        resolveFn(result);
      } catch (error) {
        rejectFn(error);
      }
    });
    return promise;
  }
}
