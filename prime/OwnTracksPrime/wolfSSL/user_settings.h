    #define MBED
    
    #define SINGLE_THREADED
    #define WOLFSSL_USER_IO
    #define NO_WRITEV
    #define NO_DEV_RANDOM
    #define NO_SHA512
    #define NO_DSA
    #define NO_HC128

    #define HAVE_ECC
    #define NO_CLIENT_CACHE // For even Smaller RAM
    #define NO_SESSION_CACHE // For Small RAM
    //#define IGNORE_KEY_EXTENSIONS
    #define NO_FILESYSTEM
    #define NO_WOLFSSL_DIR  
    #define NO_DES3 // 3 des is being phased out
    #define NO_MD4 // MD4 is broken and shouldn't be used
    #define DEBUG_WOLFSSL
    #define SSL_CFG_PSK_EN

    #define WOLFSSL_NO_VERIFYSERVER
    #ifndef WOLFSSL_NO_VERIFYSERVER
        #define TIME_OVERRIDES
        #define XTIME time
        #define XGMTIME localtime
    #endif
    //#define WOLFSSL_CALLBACKS
    //#define USER_TIME
    //#define USE_FAST_MATH // assembler implementation of bigInt routines
    //#define TFM_TIMING_RESISTANT // uses less memory when fast math is enabled
