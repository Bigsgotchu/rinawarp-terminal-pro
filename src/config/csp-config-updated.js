// Updated CSP Configuration with all required hashes
export const getCSPHeader = nonce => {
  const scriptHashes = [
    'sha256-75UjkgWl1ciiClQcZlt3z6BXga/OTL1hm9z3tozPwKA=',
    'sha256-KKraR6z3U0TYXEIFhs9yFznk2lRjBRawwkQ4u2ThztA=',
    'sha256-AsGotMGpy72AfMtuDKwlIvCehG49Z2RXPoNvsL5zf+8=',
    'sha256-5bOs6iB5Qs6WlEddMTpwnnVfzKxWh1k5OkpP3/v/e+Q=',
    'sha256-JYaAuwsOGFMY7rFKDFg0Uw72ea+StgJgyhv92ihXROY=',
    'sha256-MiYwy8HfylR6mA0ct/9LJlm5YidmR3NDeQ5iFYPHtM8=',
    'sha256-g2pq/DB/KinUH4AnxTn2CPTre815ZmfBOv9NoZ+kwrw=',
    'sha256-EyC5jT6PjcUEGzrndy1BeJwlhCeXrlBar+WNcJjIoQQ=',
    'sha256-dv0rqapKvOnS5+qleQY6PvY0TRbjIOaVrNgtIerX7CE=',
    'sha256-JEzp6mALRMA0VC2/4JuAi3KW3S3cErZLtLWPYSaGtKo=',
    'sha256-0sZfrfsm6zmr8O6kxsHCMixQDrgHYSA2HKdqTAvvLRc=',
    'sha256-XRUsycQbRT669adNEj1I9fdKV2mqTx69xbaryUAG3VM=',
    'sha256-WbMETCyZwrAvZQDjHLztgBxMvbsqft/hWi3ms5p1BmU=',
    'sha256-zrdr3AD8O2CM/wOoTmQX1ErIU4SU1DL+CcMywMnU7+E=',
    'sha256-nhI1CirQUC62jJktTOY1SODw8FmkQqoder4ixakYu+k=',
    'sha256-fG6zFvZMFP3nYWgfVGxNvvdOAatRHZdTJfLlHjlVh4o=',
    'sha256-3k5kOGsc3pLUkO4xGN7jE1I8y4y2EcasSRDYyHDgmBY=',
    'sha256-WjF2Rr6FZ5yl+a/SbyCKfs6KZm02DGauQAEM8rpblMc=',
    'sha256-98jr+9yCAv+V38Vr9qcaiC7xpi3q0xDMaE1XOJNtW5w=',
    'sha256-QrJ6CWJqozSO561B2dYn9STnN9aDmufJ/TaqV0+xIbk=',
    'sha256-AxFy76dMMNrnVbPtOyuEdWVcju/NMoKEzhLpnaVhSnU=',
    'sha256-IeTs/9Bjq76CfBBFXemz0R16PpDN/4Ahrcor9Py8N9g=',
    'sha256-4GbzilX5LLnhGB3gdM0mFXzNZXfU2aBOG91ErKGQgGU=',
    'sha256-nQN88m3KnMyq91D5TWVjccN6Q9OMT/MpnvlnX8BhZSY=',
    'sha256-hLTlYrWUXIvAxARHlWS/7SkM4eOH2vTsgl/PfnUJFCo=',
    'sha256-g0e11eb5MzzfhOLd4f+hTLayaTJlomAH+nLoIWXmxcE=',
    'sha256-GXmSrQhZruaWt49FdF2+47G1vOJBbRZDVAoY8xfVK4s=',
    'sha256-VzjepCSDIm+svU+t9beZC2kWFe9C4+MBAzYK7+t+r00=',
    'sha256-eOhGgqWHp9mkN57ACzFqy4g8sM82ikqmPtbW5cFpI9c=',
    'sha256-oI+DsseCcKKYNZbJovA1sy7JvqOKC6b8hRlso+EVMvI=',
    'sha256-872hLtYh89v1MmFad56ii3HkHlWvcX56j7Cpz72gMLQ=',
  ];

  const directives = [
    "default-src 'self'",
    `script-src 'self' ${scriptHashes.join(' ')} https://js.stripe.com https://checkout.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://cdn.logrocket.io`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob: https://www.google-analytics.com https://www.googletagmanager.com https://*.stripe.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' wss: ws: https://api.stripe.com https://checkout.stripe.com https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://*.railway.app https://*.logrocket.io",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com",
    "form-action 'self' https://checkout.stripe.com",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ];

  return directives.join('; ');
};
