import React from 'react'
import { ChakraProvider } from '@chakra-ui/react';

type Props = {
    children: React.ReactNode;
};

const Template = ({ children }: Props) => {
    return (
        <ChakraProvider>
            {children}
        </ChakraProvider >
    )
}

export default Template