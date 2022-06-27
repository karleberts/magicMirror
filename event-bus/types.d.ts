export interface SocketEvent<T> {
    method: string,
    data: T,
    error?: string,
    from?: string,
    id?: string,
    to?: string,
}

export type SocketRequest<T> = {
    topic: string,
    params: T,
    respond: (to: string, id: string, params: any) => void,
}

export interface SocketMessage<T> extends SocketEvent<T> {
    from: string,
    data: {
        topic: string,
        contents: T,
    }
}