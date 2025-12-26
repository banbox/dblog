import * as p from '@subsquid/evm-codec'
import { event, fun, viewFun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const events = {
    EIP712DomainChanged: event("0x0a6387c9ea3628b88a633bb4f3b151770f70085117a15f9bf3787cda53f13d31", "EIP712DomainChanged()", {}),
    SessionKeyRegistered: event("0xfb073c1f3afcaef0dd69fdb4fe0c69ede2f129ef77ea38869b0a39f38b08e59b", "SessionKeyRegistered(address,address,address,uint48,uint48,uint256)", {"owner": indexed(p.address), "sessionKey": indexed(p.address), "allowedContract": p.address, "validAfter": p.uint48, "validUntil": p.uint48, "spendingLimit": p.uint256}),
    SessionKeyRevoked: event("0x744157ccffbd293a2e8644928cd7d23d650f869b88f72d7bfea8041b76ca6bec", "SessionKeyRevoked(address,address)", {"owner": indexed(p.address), "sessionKey": indexed(p.address)}),
    SessionKeyUsed: event("0x45c102106effd6bb868bd8deeb1d34a9025f7839028351831a77efb9f614ec4b", "SessionKeyUsed(address,address,address,bytes4,uint256)", {"owner": indexed(p.address), "sessionKey": indexed(p.address), "target": p.address, "selector": p.bytes4, "value": p.uint256}),
}

export const functions = {
    DOMAIN_SEPARATOR: viewFun("0x3644e515", "DOMAIN_SEPARATOR()", {}, p.bytes32),
    MAX_SESSION_DURATION: viewFun("0xcd8cd4ad", "MAX_SESSION_DURATION()", {}, p.uint48),
    OPERATION_TYPEHASH: viewFun("0x93aaa146", "OPERATION_TYPEHASH()", {}, p.bytes32),
    REGISTER_TYPEHASH: viewFun("0x6a5306a3", "REGISTER_TYPEHASH()", {}, p.bytes32),
    eip712Domain: viewFun("0x84b0196e", "eip712Domain()", {}, {"fields": p.bytes1, "name": p.string, "version": p.string, "chainId": p.uint256, "verifyingContract": p.address, "salt": p.bytes32, "extensions": p.array(p.uint256)}),
    getAllowedSelectors: viewFun("0x2b85fa4e", "getAllowedSelectors(address,address)", {"owner": p.address, "sessionKey": p.address}, p.array(p.bytes4)),
    getRemainingSpendingLimit: viewFun("0x7659316d", "getRemainingSpendingLimit(address,address)", {"owner": p.address, "sessionKey": p.address}, p.uint256),
    getSessionKeyData: viewFun("0x4802254e", "getSessionKeyData(address,address)", {"owner": p.address, "sessionKey": p.address}, p.struct({"sessionKey": p.address, "validAfter": p.uint48, "validUntil": p.uint48, "allowedContract": p.address, "allowedSelectors": p.array(p.bytes4), "spendingLimit": p.uint256, "spentAmount": p.uint256, "nonce": p.uint256})),
    isSessionKeyActive: viewFun("0x0d1e4947", "isSessionKeyActive(address,address)", {"owner": p.address, "sessionKey": p.address}, p.bool),
    ownerNonces: viewFun("0x56916b04", "ownerNonces(address)", {"_0": p.address}, p.uint256),
    registerSessionKey: fun("0x9f84256e", "registerSessionKey(address,uint48,uint48,address,bytes4[],uint256)", {"sessionKey": p.address, "validAfter": p.uint48, "validUntil": p.uint48, "allowedContract": p.address, "allowedSelectors": p.array(p.bytes4), "spendingLimit": p.uint256}, ),
    registerSessionKeyWithSignature: fun("0x9b71d99c", "registerSessionKeyWithSignature(address,address,uint48,uint48,address,bytes4[],uint256,uint256,bytes)", {"owner": p.address, "sessionKey": p.address, "validAfter": p.uint48, "validUntil": p.uint48, "allowedContract": p.address, "allowedSelectors": p.array(p.bytes4), "spendingLimit": p.uint256, "deadline": p.uint256, "signature": p.bytes}, ),
    revokeSessionKey: fun("0x84f4fc6a", "revokeSessionKey(address)", {"sessionKey": p.address}, ),
    validateAndUseSessionKey: fun("0x9fd63940", "validateAndUseSessionKey(address,address,address,bytes4,bytes,uint256,uint256,bytes)", {"owner": p.address, "sessionKey": p.address, "target": p.address, "selector": p.bytes4, "callData": p.bytes, "value": p.uint256, "deadline": p.uint256, "signature": p.bytes}, p.bool),
    validateSessionKey: viewFun("0xf514eac6", "validateSessionKey(address,address,address,bytes4,uint256)", {"owner": p.address, "sessionKey": p.address, "target": p.address, "selector": p.bytes4, "value": p.uint256}, p.bool),
}

export class Contract extends ContractBase {

    DOMAIN_SEPARATOR() {
        return this.eth_call(functions.DOMAIN_SEPARATOR, {})
    }

    MAX_SESSION_DURATION() {
        return this.eth_call(functions.MAX_SESSION_DURATION, {})
    }

    OPERATION_TYPEHASH() {
        return this.eth_call(functions.OPERATION_TYPEHASH, {})
    }

    REGISTER_TYPEHASH() {
        return this.eth_call(functions.REGISTER_TYPEHASH, {})
    }

    eip712Domain() {
        return this.eth_call(functions.eip712Domain, {})
    }

    getAllowedSelectors(owner: GetAllowedSelectorsParams["owner"], sessionKey: GetAllowedSelectorsParams["sessionKey"]) {
        return this.eth_call(functions.getAllowedSelectors, {owner, sessionKey})
    }

    getRemainingSpendingLimit(owner: GetRemainingSpendingLimitParams["owner"], sessionKey: GetRemainingSpendingLimitParams["sessionKey"]) {
        return this.eth_call(functions.getRemainingSpendingLimit, {owner, sessionKey})
    }

    getSessionKeyData(owner: GetSessionKeyDataParams["owner"], sessionKey: GetSessionKeyDataParams["sessionKey"]) {
        return this.eth_call(functions.getSessionKeyData, {owner, sessionKey})
    }

    isSessionKeyActive(owner: IsSessionKeyActiveParams["owner"], sessionKey: IsSessionKeyActiveParams["sessionKey"]) {
        return this.eth_call(functions.isSessionKeyActive, {owner, sessionKey})
    }

    ownerNonces(_0: OwnerNoncesParams["_0"]) {
        return this.eth_call(functions.ownerNonces, {_0})
    }

    validateSessionKey(owner: ValidateSessionKeyParams["owner"], sessionKey: ValidateSessionKeyParams["sessionKey"], target: ValidateSessionKeyParams["target"], selector: ValidateSessionKeyParams["selector"], value: ValidateSessionKeyParams["value"]) {
        return this.eth_call(functions.validateSessionKey, {owner, sessionKey, target, selector, value})
    }
}

/// Event types
export type EIP712DomainChangedEventArgs = EParams<typeof events.EIP712DomainChanged>
export type SessionKeyRegisteredEventArgs = EParams<typeof events.SessionKeyRegistered>
export type SessionKeyRevokedEventArgs = EParams<typeof events.SessionKeyRevoked>
export type SessionKeyUsedEventArgs = EParams<typeof events.SessionKeyUsed>

/// Function types
export type DOMAIN_SEPARATORParams = FunctionArguments<typeof functions.DOMAIN_SEPARATOR>
export type DOMAIN_SEPARATORReturn = FunctionReturn<typeof functions.DOMAIN_SEPARATOR>

export type MAX_SESSION_DURATIONParams = FunctionArguments<typeof functions.MAX_SESSION_DURATION>
export type MAX_SESSION_DURATIONReturn = FunctionReturn<typeof functions.MAX_SESSION_DURATION>

export type OPERATION_TYPEHASHParams = FunctionArguments<typeof functions.OPERATION_TYPEHASH>
export type OPERATION_TYPEHASHReturn = FunctionReturn<typeof functions.OPERATION_TYPEHASH>

export type REGISTER_TYPEHASHParams = FunctionArguments<typeof functions.REGISTER_TYPEHASH>
export type REGISTER_TYPEHASHReturn = FunctionReturn<typeof functions.REGISTER_TYPEHASH>

export type Eip712DomainParams = FunctionArguments<typeof functions.eip712Domain>
export type Eip712DomainReturn = FunctionReturn<typeof functions.eip712Domain>

export type GetAllowedSelectorsParams = FunctionArguments<typeof functions.getAllowedSelectors>
export type GetAllowedSelectorsReturn = FunctionReturn<typeof functions.getAllowedSelectors>

export type GetRemainingSpendingLimitParams = FunctionArguments<typeof functions.getRemainingSpendingLimit>
export type GetRemainingSpendingLimitReturn = FunctionReturn<typeof functions.getRemainingSpendingLimit>

export type GetSessionKeyDataParams = FunctionArguments<typeof functions.getSessionKeyData>
export type GetSessionKeyDataReturn = FunctionReturn<typeof functions.getSessionKeyData>

export type IsSessionKeyActiveParams = FunctionArguments<typeof functions.isSessionKeyActive>
export type IsSessionKeyActiveReturn = FunctionReturn<typeof functions.isSessionKeyActive>

export type OwnerNoncesParams = FunctionArguments<typeof functions.ownerNonces>
export type OwnerNoncesReturn = FunctionReturn<typeof functions.ownerNonces>

export type RegisterSessionKeyParams = FunctionArguments<typeof functions.registerSessionKey>
export type RegisterSessionKeyReturn = FunctionReturn<typeof functions.registerSessionKey>

export type RegisterSessionKeyWithSignatureParams = FunctionArguments<typeof functions.registerSessionKeyWithSignature>
export type RegisterSessionKeyWithSignatureReturn = FunctionReturn<typeof functions.registerSessionKeyWithSignature>

export type RevokeSessionKeyParams = FunctionArguments<typeof functions.revokeSessionKey>
export type RevokeSessionKeyReturn = FunctionReturn<typeof functions.revokeSessionKey>

export type ValidateAndUseSessionKeyParams = FunctionArguments<typeof functions.validateAndUseSessionKey>
export type ValidateAndUseSessionKeyReturn = FunctionReturn<typeof functions.validateAndUseSessionKey>

export type ValidateSessionKeyParams = FunctionArguments<typeof functions.validateSessionKey>
export type ValidateSessionKeyReturn = FunctionReturn<typeof functions.validateSessionKey>

