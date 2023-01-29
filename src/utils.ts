import BN from 'bn.js';
const EC = require('elliptic');
const secp256k1 = require('secp256k1');
const base58check = require('base58check');
const bitcoinMessage = require('bitcoinjs-message');

const ensure0x = (input: string | Buffer) => {

    if (input instanceof Buffer) {
        input = input.toString('hex');
    }

    if (!input.startsWith('0x')) {
        return '0x' + input;
    }
    return input;
}

const dmdAddressToRipeResult = (address: string) => {
    // console.log('address:', address);
    const decoded = base58check.decode(address);
    // console.log('decoded:', decoded);
    return decoded.data;
}

const SEGWIT_TYPES = {
    P2WPKH: 'p2wpkh',
    P2SH_P2WPKH: 'p2sh(p2wpkh)'
}

const decodeSignature = (buffer: Buffer) => {

    if (buffer.length !== 65) throw new Error('Invalid signature length')

    const flagByte = buffer.readUInt8(0) - 27
    if (flagByte > 15 || flagByte < 0) {
        throw new Error('Invalid signature parameter')
    }

    return {
        compressed: !!(flagByte & 12),
        segwitType: !(flagByte & 8)
            ? null
            : !(flagByte & 4)
                ? SEGWIT_TYPES.P2SH_P2WPKH
                : SEGWIT_TYPES.P2WPKH,
        recovery: flagByte & 3,
        signature: buffer.slice(1)
    }
}

const getPublicKeyFromSignature = (signatureBase64: string, messageContent: string): { publicKey: string, x: string, y: string } => {

    const signature = Buffer.from(signatureBase64, 'base64');
    console.log(signature)

    const parsed = decodeSignature(signature);
    console.log('parsed Signature:', parsed);

    const hash = bitcoinMessage.magicHash(messageContent);

    const publicKey = secp256k1.recover(
        hash,
        parsed.signature,
        parsed.recovery,
        parsed.compressed
    )

    //we now have the public key
    //public key is the X Value with a prefix.
    //it's 02 or 03 prefix, depending if y is ODD or not.
    console.log("publicKey: ", publicKey.toString('hex'));

    const x = publicKey.slice(1).toString('hex');
    console.log("x: " + x);


    var ec = new EC.ec('secp256k1');

    const key = ec.keyFromPublic(publicKey);
    const y = key.getPublic().getY().toString('hex');

    console.log("y: " + y);

    return { publicKey: publicKey.toString('hex'), x, y };
}


const getXYfromPublicKeyHex = (publicKeyHex: string): { x: BN; y: BN; } => {
    var ec = new EC.ec('secp256k1');
    var publicKey = ec.keyFromPublic(publicKeyHex.toLowerCase(), 'hex').getPublic();
    var x = publicKey.getX();
    var y = publicKey.getY();

    //console.log("pub key:" + publicKey.toString('hex'));
    //console.log("x :" + x.toString('hex'));
    //console.log("y :" + y.toString('hex'));
    return { x, y };
}

const signatureBase64ToRSV = (signatureBase64: string): { r: Buffer, s: Buffer, v: number } => {
    //var ec = new EC.ec('secp256k1');

    //const input = new EC. SignatureInput();


    // const signature = new EC.ec.Signature(signatureBase64, 'base64');

    // const rr = signature.r.toBuffer();
    // const ss = signature.s.toBuffer();
    // const vv = signature.recoveryParam;

    // console.log(`r: ${rr.toString('hex')}`);
    // console.log(`s: ${ss.toString('hex')}`);
    // console.log(`v: ${vv}`);

    // return { r: rr, s: ss, v: vv};

    // where is the encoding of the signature documented ?
    //is that DER encoding ? Or the Significant part of DER ?

    const sig = Buffer.from(signatureBase64, 'base64');

    console.log('sigBuffer:');
    console.log(sig.toString('hex'));

    //thesis: 
    // 20 is a header, and v is not included in the signature ?
    const sizeOfRComponent = sig[0];
    console.log('sizeOfR:', sizeOfRComponent);

    const rStart = 1; // r Start is always one (1).
    const sStart = 1 + sizeOfRComponent;
    const sizeOfSComponent = sig.length - sStart;
    console.log('sizeOfS:', sizeOfSComponent);

    if (sizeOfRComponent > sig.length) {
        throw new Error('sizeOfRComponent is too Big!!');
    }
    const r = sig.subarray(rStart, rStart + sizeOfRComponent);
    const s = sig.subarray(sStart, 65);
    const v = 0; //sig[64];

    console.log(`r: ${r.toString('hex')}`);
    console.log(`s: ${s.toString('hex')}`);
    console.log(`v: ${v}`);

    return { r, s, v };
}


export { ensure0x, dmdAddressToRipeResult, getPublicKeyFromSignature, getXYfromPublicKeyHex, signatureBase64ToRSV };