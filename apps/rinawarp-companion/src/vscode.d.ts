declare module 'vscode' {
  export interface Disposable {
    dispose(): void;
  }

  export interface Event<T> {
    (listener: (event: T) => unknown): Disposable;
  }

  export class EventEmitter<T> implements Disposable {
    readonly event: Event<T>;
    fire(data: T): void;
    dispose(): void;
  }

  export interface SecretStorage {
    get(key: string): Thenable<string | undefined>;
    store(key: string, value: string): Thenable<void>;
    delete(key: string): Thenable<void>;
  }

  export interface ExtensionContext {
    readonly extensionUri: Uri;
    readonly secrets: SecretStorage;
    readonly subscriptions: Disposable[];
  }

  export interface Uri {
    readonly fsPath: string;
    readonly path: string;
    readonly query: string;
    toString(): string;
  }

  export namespace Uri {
    function parse(value: string): Uri;
    function file(path: string): Uri;
  }

  export interface UriHandler {
    handleUri(uri: Uri): Thenable<void> | void;
  }

  export interface OutputChannel extends Disposable {
    appendLine(value: string): void;
    clear(): void;
    show(preserveFocus?: boolean): void;
  }

  export interface Command {
    command: string;
    title: string;
    arguments?: unknown[];
  }

  export enum TreeItemCollapsibleState {
    None = 0,
    Collapsed = 1,
    Expanded = 2,
  }

  export class TreeItem {
    constructor(label: string, collapsibleState?: TreeItemCollapsibleState);
    command?: Command;
  }

  export interface TreeDataProvider<T> {
    readonly onDidChangeTreeData?: Event<T | undefined>;
    getTreeItem(element: T): TreeItem | Thenable<TreeItem>;
    getChildren(element?: T): ProviderResult<T[]>;
  }

  export type ProviderResult<T> = T | undefined | null | Thenable<T | undefined | null>;

  export interface WorkspaceConfiguration {
    get<T>(section: string, defaultValue: T): T;
  }

  export interface WorkspaceFolder {
    readonly name: string;
    readonly uri: Uri;
  }

  export namespace workspace {
    const isTrusted: boolean;
    const workspaceFolders: readonly WorkspaceFolder[] | undefined;
    function getConfiguration(section?: string): WorkspaceConfiguration;
    function openTextDocument(uri: Uri): Thenable<TextDocument>;
  }

  export namespace window {
    function createOutputChannel(name: string): OutputChannel;
    function registerTreeDataProvider<T>(viewId: string, treeDataProvider: TreeDataProvider<T>): Disposable;
    function registerWebviewViewProvider(viewId: string, provider: WebviewViewProvider): Disposable;
    function registerUriHandler(handler: UriHandler): Disposable;
    function showInformationMessage(message: string, ...items: string[]): Thenable<string | undefined>;
    function showWarningMessage(message: string): Thenable<string | undefined>;
    function showTextDocument(document: TextDocument, options?: { preview?: boolean }): Thenable<TextEditor>;
  }

  export interface TextDocument {
    readonly uri: Uri;
  }

  export interface TextEditor {}

  export interface WebviewOptions {
    enableScripts?: boolean;
  }

  export interface Webview {
    cspSource: string;
    html: string;
    options: WebviewOptions;
    postMessage(message: unknown): Thenable<boolean>;
    onDidReceiveMessage(listener: (event: unknown) => unknown): Disposable;
  }

  export interface WebviewView {
    readonly webview: Webview;
  }

  export interface WebviewViewProvider {
    resolveWebviewView(webviewView: WebviewView): void | Thenable<void>;
  }

  export namespace commands {
    function registerCommand(command: string, callback: (...args: unknown[]) => unknown): Disposable;
    function executeCommand<T = unknown>(command: string, ...rest: unknown[]): Thenable<T>;
  }

  export namespace env {
    const isTelemetryEnabled: boolean;
    const uriScheme: string;
    function openExternal(target: Uri): Thenable<boolean>;
    function asExternalUri(target: Uri): Thenable<Uri>;
  }
}
