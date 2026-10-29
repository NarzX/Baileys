import makeWASocket from './Socket/index.js';
import chalk from "chalk";
console.log(chalk.hex("#dc143c")(`
███╗░░██╗░█████╗░██████╗░███████╗██╗░░██╗
████╗░██║██╔══██╗██╔══██╗╚════██║╚██╗██╔╝
██╔██╗██║███████║██████╔╝░░███╔═╝░╚███╔╝░
██║╚████║██╔══██║██╔══██╗██╔══╝░░░██╔██╗░
██║░╚███║██║░░██║██║░░██║███████╗██╔╝╚██╗
╚═╝░░╚══╝╚═╝░░╚═╝╚═╝░░╚═╝╚══════╝╚═╝░░╚═╝       
`));
console.log(chalk.hex("#00c2ff")("NarzX — a Baileys-based WhatsApp Web library\n"));
console.log(chalk.gray("Stay updated with the latest NarzX & Baileys news:"));
console.log(chalk.cyan("https://whatsapp.com/channel/0029Vb99e3ULikg0JI7YnH1T\n"));
export * from '../WAProto/index.js';
export * from './Utils/index.js';
export * from './Types/index.js';
export * from './Defaults/index.js';
export * from './WABinary/index.js';
export * from './WAM/index.js';
export * from './WAUSync/index.js';
export * from './Store/index.js';
export { makeWASocket };
export default makeWASocket;
//# sourceMappingURL=index.js.map