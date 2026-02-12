export declare function createServer(opts: {
    port: number;
}): {
    listen(): Promise<number>;
    close(): Promise<void>;
};
