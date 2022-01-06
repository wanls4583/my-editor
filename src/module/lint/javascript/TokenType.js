/*
 * @Author: lisong
 * @Date: 2022-01-05 10:36:49
 * @Description: 
 */
import Enum from '@/common/Enum.js';

export default {
    KEYWORD: new Enum("KEYWORD", 1),
    VARIABLE: new Enum("VARIABLE", 2),
    OPERATOR: new Enum("OPERATOR", 3),
    BRACKET: new Enum("BRACKET", 4),
    NUMBER: new Enum("NUMBER", 5),
    BOOLEAN: new Enum("BOOLEAN", 6),
    STRING: new Enum("STRING", 7),
    STRING_START: new Enum("STRING_START", 8),
    COMMENT_START: new Enum("COMMENT_START", 9),
}