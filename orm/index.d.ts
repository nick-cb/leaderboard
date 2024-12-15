import { Connection } from "mysql2/promise";
type Primitive = Number | String | Date;
export declare function setupDatabase(connection: Connection | Promise<Connection>): QueryBuilder;
declare class SQL {
    private strings;
    private values;
    constructor(strings: TemplateStringsArray, values: (Primitive | SQL)[]);
    toSqlString(): {
        query: string;
        values: Primitive[];
    };
}
export declare function sql(strings: TemplateStringsArray, ...values: (Primitive | SQL)[]): SQL;
export declare function from(params: string): string[];
export declare function where(params: [string, Primitive[] | Primitive] | SQL): [string, Primitive[]];
export declare function orderBy(params: {
    [k in string]: 0 | 1;
}): string[];
export declare function set(params: {
    [k in string]: SQL | Primitive;
}): [
    string,
    Primitive[]
];
export declare function and(...params: Array<any>): (string | any[])[];
export declare function or(...params: Array<any>): (string | any[])[];
export declare function eq(key: string, value: Primitive): (string | Primitive)[];
type Query = "set" | "where" | "orderBy";
type QueryPromise<T extends Query, R extends any = Promise<any>> = Promise<any> & {
    [K in T]: (params: any) => R;
};
export declare class QueryBuilder {
    static connection: Connection;
    connection: Connection;
    select(fields: Array<string>): {
        from: (table: string) => Promise<any> & {
            where: (params: any) => QueryPromise<"orderBy", Promise<any>>;
        } & {
            orderBy: (params: any) => Promise<any>;
        };
    };
    insert(table: string): {
        values: (data: Object) => Promise<[import("mysql2/promise").QueryResult, import("mysql2/promise").FieldPacket[]]>;
    };
    update(table: string): Promise<any> & {
        set: (params: any) => QueryPromise<"where", Promise<any>>;
    } & {
        where: (params: any) => Promise<any>;
    };
}
export {};
