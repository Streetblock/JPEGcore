    Config: {
        nativeProgressiveDecode: false,
        enableArithmeticDecode: !(typeof JPEGCORE_BUILD_FLAGS === "object" && JPEGCORE_BUILD_FLAGS && JPEGCORE_BUILD_FLAGS.arithmetic === false),
        strictArithmeticDecode: false,
        strictArithmeticFailFast: false,
        arithmeticTraceLimit: 4096
    },
