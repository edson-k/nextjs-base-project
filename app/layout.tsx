import { NextAuthProvider } from "@/app/provider/NextAuthProvider";
import '@/styles/globals.css';
import '@/styles/Home.module.css';
import { Metadata } from "next";

type Props = {
    children: React.ReactNode;
};

export const metadata: Metadata = {
    title: "Next.js Base Project",
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