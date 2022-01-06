class AlphabetHelper {

    static isLetter(c) {
        return AlphabetHelper.ptnLetter.test(c)
    }
    static isNumber(c) {
        return AlphabetHelper.ptnNumber.test(c)
    }
    static isLiteral(c) {
        return AlphabetHelper.ptnLiteral.test(c)
    }
    static isOperator(c) {
        return AlphabetHelper.ptnOperator.test(c)
    }
}
AlphabetHelper.ptnLetter = /^[a-zA-Z]$/
AlphabetHelper.ptnNumber = /^[0-9]$/
AlphabetHelper.ptnLiteral = /^[_a-zA-Z0-9]$/
AlphabetHelper.ptnOperator = /^[+\-*/><=!&|^%,]$/
export default AlphabetHelper;