import { Flex, Input, Text } from '@chakra-ui/react';
import useDigitInput from 'react-digit-input';

export default function OTPCode({ value, onChange, refFocus }: { value: string; onChange: (value: string) => void; refFocus: any }) {
    const digits = useDigitInput({
        acceptedCharacters: /^[0-9-a-z-A-Z]$/,
        length: 6,
        value,
        onChange,
    });

    const className = 'h-12 w-12 !text-xl text-center';

    return (
        <>
            <Text fontSize={'1rem'} textAlign={'center'} color={'black'}>
                One Time Password
            </Text>
            <Flex justifyContent={'center'} alignItems={'center'}>
                <Input mr={2} className={className} name="2fa1" inputMode="decimal" {...digits[0]} autoFocus autoComplete="one-time-code" ref={refFocus} />
                <Input mr={2} className={className} name="2fa2" inputMode="decimal" {...digits[1]} />
                <Input mr={2} className={className} name="2fa3" inputMode="decimal" {...digits[2]} />
                <Input mr={2} className={className} name="2fa4" inputMode="decimal" {...digits[3]} />
                <Input mr={2} className={className} name="2fa5" inputMode="decimal" {...digits[4]} />
                <Input mr={2} className={className} name="2fa6" inputMode="decimal" {...digits[5]} />
            </Flex>
        </>
    );
}
