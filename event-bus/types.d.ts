export interface SocketEvent {
    method: string,
    data: any,
    error?: string,
    from?: string,
    id?: string,
    to?: string,
}