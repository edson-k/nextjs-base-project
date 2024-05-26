import { GetServerSidePropsContext } from 'next'
import { headers } from 'next/headers'

let ip: string = '';

getServerSideProps: async (context: GetServerSidePropsContext) => {
    ip = context.req.socket.remoteAddress || '';
}

export const GetIp = () => {
    const header = headers()
    const remoteIp = header.get('cf-connecting-ip') ?
        (header.get('cf-connecting-ip') ?? '127.0.0.1').split(',')[0]
        :
        header.get('x-forwarded-for') ?
            (header.get('x-forwarded-for') ?? '127.0.0.1').split(',')[0]
            :
            ip;
    return remoteIp;
}