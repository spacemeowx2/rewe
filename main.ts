import {print} from './utils'
import {promisify} from 'util'
import {readFile as readFileOri} from 'fs'
const readFile = promisify(readFileOri)
const enum Token {
  number = 1,
  op = 2,
  string = 3,
  dot = 6,
  data = 7,
  concat = 11,
}
type Express = [Token, string | number] | ExpressArray
interface ExpressArray extends Array<Express> {}
type Handler = (s: string[], b: string[]) => string
interface HandlerDefine {
  [key: number]: Handler
}
const define: HandlerDefine = {
  [Token.number]: s => s[0].toString(),
  [Token.op]: select({
    '+': (s, b) => `(${b[0]} + ${b[1]})`,
    '&&': (s, b) => `(${b[0]} && ${b[1]})`,
    '!': (s, b) => `!(${b[0]})`
  }),
  [Token.string]: s => escapeString(s[0]),
  [Token.dot]: (s, b) => `${b[0]}.${unescapeString(b[1])}`,
  [Token.data]: (s, b) => unescapeString(b[0]),
  [Token.concat]: (s, b) => s.map(i => `{{${i}}}`).join('')
}
function exp2str (exp: Express, behind?: string[]): string {
  let ret: string[] = []
  for (let i = exp.length - 1; i >= 0; i--) {
    const item = exp[i]
    const s: string[] = ret.slice(i + 1)
    if (item instanceof Array) {
      ret[i] = exp2str(item, s)
    } else {
      ret[i] = item.toString()
    }
  }
  const first = exp[0]
  if (typeof first === 'number') {
    ret = [define[first](ret.slice(1) as any, behind)]
  }
  return ret[0]
}

async function main (argv: string[]): Promise<void> {
  if (argv.length == 0) {
    printUsage()
    return
  }
  const filename = argv[0]
  const content = JSON.parse((await readFile(filename)).toString())
  const a: any = [11, [[6], [[7], [3, "userInfo"]], [3, "nickName"]]]
  // print(exp2str(a))

  const result: string[] = content.map((i: any) => exp2str(i))
  for (let i of result) {
    print(i)
  }
}

function printUsage () {
  print('npm start INPUT_FILE.json')
}
function escapeString (s: string) {
  return `"${s.replace(/"/g, `\"`)}"`
}
function unescapeString (s: string) {
  return s.substring(1, s.length - 1).replace(/\\"/g, `"`)
}
function select (table: { [key: string]: Handler }): Handler {
  return (s, b) => table[s[0]](s.slice(1), b)
}

const argv = process.argv.slice(2)
main(argv).catch(e => console.error(e))
