"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: '.env.local' });
var config_1 = require("./src/firebase/config");
var firebase_1 = require("./src/firebase");
var firestore_1 = require("firebase/firestore");
var data_store_1 = require("./src/lib/data-store");
var run = function () { return __awaiter(void 0, void 0, void 0, function () {
    var config, db, studentsSnapshot, periodsSnapshot, feeCategoriesSnapshot, periods, feeCategories, _i, _a, studentDoc, data, name_1, currentPeriod, balanceInfo, err_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                config = (0, config_1.getFirebaseConfig)();
                db = (0, firebase_1.initializeFirebase)(config).db;
                return [4 /*yield*/, (0, firestore_1.getDocs)((0, firestore_1.collection)(db, 'students'))];
            case 1:
                studentsSnapshot = _b.sent();
                return [4 /*yield*/, (0, firestore_1.getDocs)((0, firestore_1.collection)(db, 'academicPeriods'))];
            case 2:
                periodsSnapshot = _b.sent();
                return [4 /*yield*/, (0, firestore_1.getDocs)((0, firestore_1.collection)(db, 'feeCategories'))];
            case 3:
                feeCategoriesSnapshot = _b.sent();
                periods = periodsSnapshot.docs.map(function (d) { return (__assign({ id: d.id }, d.data())); });
                feeCategories = feeCategoriesSnapshot.docs.map(function (d) { return (__assign({ id: d.id }, d.data())); });
                for (_i = 0, _a = studentsSnapshot.docs; _i < _a.length; _i++) {
                    studentDoc = _a[_i];
                    data = studentDoc.data();
                    name_1 = data.name || '';
                    if (name_1.toLowerCase().includes('adorye otubea')) {
                        console.log("Found student: ".concat(name_1, " (").concat(studentDoc.id, ")"));
                        currentPeriod = periods.find(function (p) { return p.isCurrent; });
                        balanceInfo = (0, data_store_1.calculateStudentTotalBalance)(data, periods, currentPeriod === null || currentPeriod === void 0 ? void 0 : currentPeriod.id, feeCategories);
                        console.log("Main Balance Data:", JSON.stringify(balanceInfo.mainData, null, 2));
                        console.log("Daily Balance Data:", JSON.stringify(balanceInfo.dailyData, null, 2));
                        console.log("Total Outstanding:", balanceInfo.totalOutstanding);
                        console.log("\nLedger:", JSON.stringify(data.ledger, null, 2));
                    }
                }
                return [3 /*break*/, 5];
            case 4:
                err_1 = _b.sent();
                console.error(err_1);
                return [3 /*break*/, 5];
            case 5:
                process.exit(0);
                return [2 /*return*/];
        }
    });
}); };
run();
