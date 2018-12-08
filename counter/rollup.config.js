import typescript from 'rollup-plugin-typescript2';
import resolve    from 'rollup-plugin-node-resolve';
import copy       from 'rollup-plugin-copy';
 
export default {
    plugins: [
        typescript({
            typescript: require('typescript'),
        }),
        resolve(),
        copy({
            "src/index.html": "dist/index.html",
            "src/index.css": "dist/index.css"
        })
    ]
}