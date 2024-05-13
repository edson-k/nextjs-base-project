import React from 'react'
import { Flex } from '@chakra-ui/react';
import Form from '@/components/form';

const Page = () => {
    return (
        <Flex
            w={'100%'}
            h={'100vh'}
            justifyContent={'center'}
            alignItems={'center'}
            my={{ base: '75px', md: '0' }}
        >
            <Form />
        </Flex>
    )
}

export default Page