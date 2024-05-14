import { Flex, Text } from '@chakra-ui/react';
import { UserData } from '@/app/services/fetchServer';
import Content from '@/app/profile/components/content';
import { redirect } from 'next/navigation'

export default async function Profile() {
    const data: any = await UserData();

    if (data?.redirect) redirect(data.redirect.destination);
    const user = data?.props?.user;

    return (
        <Flex w={'50%'} mx={'auto'} flexDirection={'column'} justifyContent={'center'} my={5} fontFamily={'monospace'}>
            <Text color={'teal.500'} fontSize="lg" textAlign={'center'}>
                Welcome {user?.name} to our website
            </Text>
            <Content user={user} />
        </Flex>
    );
}
