import { NextAuthProvider } from "@/app/provider/NextAuthProvider";
import '@/styles/globals.css';
import '@/styles/Home.module.css';

type Props = {
    children: React.ReactNode;
};

export default function RootLayout({ children }: Props) {
    return (
        <html>
            <body suppressHydrationWarning={true}>
                <NextAuthProvider>
                    {children}
                </NextAuthProvider >
            </body>
        </html>
    );
}