self.__uv$config = {
    prefix: '/active/go/',
    bare: '/bare/',

    encodeUrl: (url) => Ultraviolet.codec.xor.encode(url),
    decodeUrl: (url) => Ultraviolet.codec.xor.decode(url),

    handler: '/active/uv/uv.handler.js',
    bundle: '/active/uv/uv.bundle.js',
    config: '/active/uv/uv.config.js',
    sw: '/active/uv/uv.sw.js',
};
