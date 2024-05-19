export const checkInput = (inputRef: any) => {
    const check = setInterval(() => {
        try {
            inputRef.current.focus();
            clearInterval(check);
        } catch (e) { }
    }, 5);
}