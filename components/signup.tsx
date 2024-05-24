import { fetchSignUp } from '@/app/services/fetchClient';
import InputUtil from '@/utils/input';
import { Button, Flex, FormControl, FormErrorMessage, Heading, Input, InputGroup, InputLeftAddon, Text, useToast, VStack } from '@chakra-ui/react';
import { Dispatch, SetStateAction, useRef, useState } from 'react';
import { RiInputField } from "react-icons/ri";
import { AiTwotoneMail } from "react-icons/ai";
import { TbPasswordUser } from "react-icons/tb";
import ReCAPTCHA from "react-google-recaptcha";

interface SignUpProps {
    isSignInMode: boolean;
    setSignInMode: Dispatch<SetStateAction<boolean>>;
}
export default function SignUn(props: SignUpProps) {
    const [name, setName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [isEmailInvalid, setEmailInvalid] = useState<boolean>(false);
    const reRef: any = useRef<ReCAPTCHA>();
    const [load, setLoad] = useState<boolean>(false);
    const toast = useToast();

    // Validate inputs
    const validateInputs = () => setEmailInvalid(true);

    const inputRefName: any = useRef(null);
    if (!load) {
        InputUtil.focus(inputRefName);
        setLoad(true);
    }

    const signUpEvent = () => {
        props.setSignInMode(false)
        setEmailInvalid(false);
        setName('');
        setEmail('');
        setPassword('');
        setLoad(false);
    }

    const handleSignup = async (e: React.SyntheticEvent) => {
        e.preventDefault();

        const token = await reRef?.current?.executeAsync();

        const newUser = {
            name,
            email,
            password,
            token,
        };

        const data = await fetchSignUp(newUser);
        if (data.userExists) {
            validateInputs();
        } else {
            if (data.error) {
                toast({
                    title: data.message,
                    status: 'error',
                });
            } else {
                toast({
                    title: data.message,
                    status: 'success',
                });
                setEmailInvalid(false);
                setName('');
                setEmail('');
                setPassword('');
                props.setSignInMode(true);
            }
        }
    };
    return (
        <Flex h={'88%'} flexDirection={'column'} justifyContent={'center'} alignItems={'center'} px={5}>
            {props.isSignInMode ? (
                <VStack spacing={7} color={'white'} fontFamily={'monospace'}>
                    <Heading as="h2" fontWeight={'bolder'}>
                        New Here?
                    </Heading>
                    <Text textAlign={'center'} fontSize={'1rem'}>
                        Create an account and start your journey with us
                    </Text>
                    <Button
                        border={'2px solid #fff'}
                        borderRadius={'full'}
                        bgColor={'transparent'}
                        color={'white'}
                        w={'50%'}
                        onClick={() => signUpEvent()}
                        _hover={{ bgColor: '#fff', color: '#319795' }}
                    >
                        SIGN UP
                    </Button>
                </VStack>
            ) : (
                <VStack w={'100%'} spacing={5}>
                    <Heading as="h2">Create Account</Heading>
                    <form onSubmit={handleSignup} style={{ width: '75%' }}>
                        <VStack spacing={3}>
                            <FormControl isRequired={true}>
                                <InputGroup>
                                    <InputLeftAddon><RiInputField /></InputLeftAddon>
                                    <Input type={'text'} placeholder={'Name'} name="name" minLength={1} maxLength={50} value={name} onChange={(e) => setName(e.target.value)} ref={inputRefName} />
                                </InputGroup>
                            </FormControl>
                            <FormControl isRequired={true} isInvalid={isEmailInvalid}>
                                <InputGroup>
                                    <InputLeftAddon><AiTwotoneMail /></InputLeftAddon>
                                    <Input type={'email'} placeholder={'Email'} name="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                                    <FormErrorMessage>A user already exist with the entered email</FormErrorMessage>
                                </InputGroup>
                            </FormControl>
                            <FormControl isRequired={true}>
                                <InputGroup>
                                    <InputLeftAddon><TbPasswordUser /></InputLeftAddon>
                                    <Input type={'password'} placeholder={'Password'} name="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                                </InputGroup>
                            </FormControl>
                            {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ? <ReCAPTCHA sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''} size='invisible' ref={reRef} /> : ''}
                            <Flex justifyContent={'center'} w={'60%'}>
                                <Button
                                    type="submit"
                                    borderRadius={'full'}
                                    w={'100%'}
                                    bgColor={'#319795'}
                                    fontFamily={'monospace'}
                                    color={'white'}
                                    _hover={{
                                        bgColor: 'transparent',
                                        color: '#319795',
                                        border: '2px solid #319795',
                                    }}
                                >
                                    SIGN UP
                                </Button>
                            </Flex>
                        </VStack>
                    </form>
                </VStack>
            )}
        </Flex>
    );
}
