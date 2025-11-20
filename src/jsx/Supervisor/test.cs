using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using Sahakaar_API.Authentication;
using Sahakaar_API.Models;
using Sahakaar_API.Models.Masters;
using Sahakaar_API.Services;
using Microsoft.AspNetCore.Http;
using Dapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Hosting;
using System.Data;
using Sahakaar_API.Lib;
using System.Drawing;
using System.IO;
using System.Collections;
using System.Reflection;
using Newtonsoft.Json.Linq;
using System.Net;

namespace Sahakaar_API.Controllers.V1.Masters
{
    [Route("api/V1/EInvoice")]
    [ApiController]
        public class ctlEInvoice : ControllerBase
    {
        private readonly svcCommon _svc;
        private readonly IWebHostEnvironment _environment;
        private readonly string sTableName = "MemberMaster";

        private readonly string sAddEdit_ProcedureNameBuyerDetails = "Get_Buy_Seller_Details";
        private readonly string sAddEdit_ProcedureNameItemDetails = "GetItems";
        private readonly mCommon mModel = new mCommon();
        private readonly IConfiguration _configuration;
        private string ErrorMessage = "";
        private string AccountHolderName = "";
        private string api_TransactionCode = "";
        private string UTR = "";
        private string ResponseLog = "";
        private string ErrorCode = "";

        string BuyerGstin = "";
        string BuyerLglNm = "";
        string BuyerTrdNm = "";
        decimal BuyerPos = 0;
        string BuyerAddr1 = null;
        string BuyerAddr2 = null;
        string BuyerLoc = null;
        decimal BuyerPin = 0;
        decimal BuyerStcd = 0;
        decimal BuyerPh = 0;
        string BuyerEm = null;




        string SellerGstin = null;
        string SellerLglNm = null;
        string SellerTrdNm = null;
        string SellerAddr1 = null;
        string SellerAddr2 = null;
        string SellerLoc = null;
        decimal SellerPin = 0;
        decimal SellerStcd = 0;
        decimal SellerPh = 0;
        string SellerEm = null;


        decimal Distance = 0;


        decimal AssVal = 0;
        decimal CgstVal = 0;
        decimal SgstVal = 0;
        decimal IgstVal = 0;
        decimal TotInvVal = 0;
        string Voucherdate = null;
        string VoucherNo = null;

        string EInvoiceUserName = null;
        string EInvoicePassword = null;

        string INVType = null;


        string Message = null;













        string Items = null;

        string Response = null;


        string IRN = null;
        string Ackno = null;
        string SignedQrCode = null;
        string AckDt    = null;






        public ctlEInvoice(svcCommon svc, IConfiguration configuration, IWebHostEnvironment environment)
        {
            this._svc = svc;
            this._environment = environment;
            //
            this._svc.sTableName = sTableName;
            this._svc.sAddEdit_ProcedureName = sAddEdit_ProcedureNameBuyerDetails;
            this._configuration = configuration;

        }
        // POST: api/add
        [HttpPost]
        [Route("{UserId}/{UserToken}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Add(string UserId, string UserToken, [FromForm] mEInvoice dataReceived)
        {
            return await Add_Edit(UserId, UserToken, Id: 0, dataReceived: dataReceived);
        }
        // PUT: api/update/5
        [HttpPut]
        [Route("{UserId}/{UserToken}/{Id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Update(string UserId, string UserToken, [FromForm] mEInvoice dataReceived, decimal Id)
        {
            return await Add_Edit(UserId, UserToken, Id: Id, dataReceived: dataReceived);
        }

        private string CallAPI()
        {


                                    string DATA = "{ " +
                          "\"Version\": \"1.1\", " +
                          "\"TranDtls\": { " +
                          "    \"TaxSch\": \"GST\"," +
                           "   \"SupTyp\": \"B2B\"," +
                            "  \"RegRev\": \"N\"," +
                            "  \"EcmGstin\": null," +
                            "  \"IgstOnIntra\": \"N\"" +
                          "}," +
                         " \"DocDtls\": {" +
                          "    \"Typ\": \""+INVType+"\"," +
                          "    \"No\": \"" + VoucherNo + "\"," +
                          "    \"Dt\": \"" + Voucherdate + "\"" +
                          "}," +
                          "\"BuyerDtls\": {" +
                          "    \"Gstin\": \"" + BuyerGstin + "\"," +
                          "    \"LglNm\": \"" + BuyerLglNm + "\"," +
                          "    \"TrdNm\": \"" + BuyerTrdNm + "\"," +
                          "    \"Pos\": \"" + 7 + "\"," +
                          "    \"Addr1\": \"" + BuyerAddr1 + "\"," +
                           "   \"Addr2\": \"" + BuyerAddr2 + "\"," +
                           "   \"Loc\": \"" + BuyerLoc + "\"," +
                           "   \"Pin\": " + BuyerPin + "," +
                           "   \"Stcd\": \"" + BuyerStcd + "\"," +
                           "   \"Ph\": \"" + BuyerPh + "\"," +
                           "   \"Em\": \"" + BuyerEm + "\"" +
                          "}," +
                          "\"SellerDtls\": {" +
                          "    \"Gstin\": \"" + SellerGstin + "\"," +
                          "    \"LglNm\": \"" + SellerLglNm + "\"," +
                          "    \"TrdNm\": \"" + SellerTrdNm + "\"," +
                          "    \"Addr1\": \"" + SellerAddr1 + "\"," +
                          "    \"Addr2\": \"" + SellerAddr2 + "\"," +
                          "    \"Loc\": \"" + SellerLoc + "\"," +
                          "    \"Pin\": " + SellerPin + "," +
                          "    \"Stcd\": \"" + SellerStcd + "\"," +
                          "    \"Ph\": \"" + SellerPh + "\"," +
                          "    \"Em\": \"" + SellerEm + "\"" +
                          "}," +


                         " \"EwbDtls\": {" +
                         "     \"TransId\": null," +
                         "     \"TransName\": null," +
                         "     \"TransMode\": null," +
                         "     \"Distance\": " + Distance + "," +
                         "     \"TransDocNo\": null," +
                         "     \"TransDocDt\": null," +
                         "     \"VehNo\": null," +
                         "     \"VehType\": null" +
                         " }," +






                         " \"ItemList\": [" +
                                  Items +

                          "]," +


                        "  \"ValDtls\": {" +
                        "      \"AssVal\": " + AssVal + "," +
                        "      \"CgstVal\": " + CgstVal + "," +
                        "      \"SgstVal\": " + SgstVal + "," +
                        "      \"IgstVal\": "+IgstVal+"," +
                        "      \"CesVal\": 0," +
                        "      \"StCesVal\": 0," +
                        "      \"RndOffAmt\": 0," +
                        "      \"TotInvVal\": " + TotInvVal + "," +
                        "      \"TotInvValFc\": 0," +
                        "      \"Discount\": 0," +
                        "      \"OthChrg\": 0" +
                        "  }" +

                        "}";
            try
            {

               
                String lUrl = "https://api.mygstcafe.com/eicore/v1.03/Invoice";
                HttpWebRequest request = (HttpWebRequest)WebRequest.Create(lUrl);
                request.Method = "POST";
                request.ContentType = "application/json";

                request.Headers["GSTIN"] = SellerGstin;
                request.Headers["CustomerName"] = "speaktosatishmh";
                request.Headers["Branch"] = "Rajasthan";
                request.Headers["Username"] = EInvoiceUserName;
                request.Headers["Password"] = EInvoicePassword;
                request.Headers["CustomerId"] = "ASP10291";
                request.Headers["APIId"] = "ZXorlEFV-BGH1-0FQv-HZ03-ZPf24ecs";
                request.Headers["APISecret"] = "ZXorlEFVBGH10FQv";
                request.Headers["Source"] = "API";


                StreamWriter requestWriter = new StreamWriter(request.GetRequestStream());

                try
                {
                    requestWriter.Write(DATA);
                }
                catch
                {
                    throw;
                }
                finally
                {
                    requestWriter.Close();
                    requestWriter = null;
                }

                HttpWebResponse response = (HttpWebResponse)request.GetResponse();
                using (StreamReader sr = new StreamReader(response.GetResponseStream()))
                {
                    Response = sr.ReadToEnd();
                    
                }
                var lk_1 = JObject.Parse(Response);



                ErrorCode = (string)lk_1.SelectToken("status_cd");

                
                if (ErrorCode  ==  "1")
                {
                    mModel.Id = 1;
                    IRN  = (string)lk_1.SelectToken("response_data.Irn");
                    Ackno  = (string)lk_1.SelectToken("response_data.AckNo");
                    AckDt = (string)lk_1.SelectToken("response_data.AckDt");
                    SignedQrCode = (string)lk_1.SelectToken("response_data.SignedQrCode");
                    Message = "EInvoice created Successfully !";
                    mModel.Name = Message;
                }

                else
                {
                    mModel.Id = 0;
                    Message = (string)lk_1.SelectToken("Error[0].ErrorMessage");
                    mModel.Name= Message;
                }
                
                //RequestLog = lPayload;
                ResponseLog = Response;


                return ResponseLog;
            }
            catch (Exception e)
            {
                Message = e.Message;
                mModel.Name = Message;
                return e.Message;
               
            }
        }

        private async Task<IActionResult> Add_Edit(string UserId, string UserToken, decimal Id, mEInvoice dataReceived)
        {
            try
            {
                /** Argument List **/
                var dbPara = new DynamicParameters();
                
                    dbPara.Add("F_InvoiceMasterH", dataReceived.F_InvoiceMasterH);
                
               

                /****/
                var data = mModel;
                var responseBuyerSeller = await _svc.Login(dbPara: dbPara , sAddEdit_ProcedureNameBuyerDetails);
                if (responseBuyerSeller != null)
                {
                   
                    foreach (var obj in responseBuyerSeller)
                    {
                        dynamic dynamicObj = obj;

                        // Access the properties using dynamic typing
                        BuyerGstin = dynamicObj.BuyerGstin.ToString();
                        BuyerLglNm = dynamicObj.BuyerLgLName.ToString();
                        BuyerTrdNm = dynamicObj.BuyerTrdName.ToString();
                        BuyerPos = 08;
                        BuyerAddr1 = dynamicObj.BuyerAddr1.ToString();
                        BuyerAddr2 = dynamicObj.BuyerAddr2.ToString();
                        BuyerLoc = dynamicObj.BuyerLoc.ToString();
                        BuyerPin = Convert.ToDecimal(dynamicObj.BuyerPin.ToString());
                        BuyerStcd = Convert.ToDecimal(dynamicObj.BuyerStdCd.ToString());
                        BuyerPh = Convert.ToDecimal(dynamicObj.BuyerPh.ToString());
                        BuyerEm = dynamicObj.BuyerEm.ToString();

                        SellerGstin = dynamicObj.SellerGstin.ToString();
                        SellerLglNm = dynamicObj.SellerLgLName.ToString();
                        SellerTrdNm = dynamicObj.SellerTrdName.ToString();
                        SellerAddr1 = dynamicObj.SellerAddr1.ToString();
                        SellerAddr2 = dynamicObj.SellerAddr2.ToString();
                        SellerLoc = dynamicObj.SellerLoc.ToString();

                        SellerPin = Convert.ToDecimal(dynamicObj.SellerPin.ToString());
                        SellerStcd = Convert.ToDecimal(dynamicObj.SellerStdCd.ToString());
                        SellerPh = Convert.ToDecimal(dynamicObj.SellerPh.ToString());
                        SellerEm = dynamicObj.SellerEm.ToString();
                        Distance = Convert.ToDecimal(dynamicObj.Distance.ToString());
                        Voucherdate = dynamicObj.Voucherdate.ToString();

                        AssVal = Convert.ToDecimal(dynamicObj.AssVal.ToString());
                        CgstVal = Convert.ToDecimal(dynamicObj.CgstVal.ToString()); 
                        SgstVal = Convert.ToDecimal(dynamicObj.SgstVal.ToString());
                        IgstVal = Convert.ToDecimal(dynamicObj.IgstVal.ToString());
                        TotInvVal = Convert.ToDecimal(dynamicObj.TotInvVal.ToString());
                        VoucherNo  = dynamicObj.VoucherNo.ToString();
                        EInvoiceUserName = dynamicObj.EInvoiceUserName.ToString();
                        EInvoicePassword = dynamicObj.EInvoicePassword.ToString();
                        INVType = dynamicObj.INVType.ToString();
                    }



                    var responseItems = await _svc.Login(dbPara: dbPara, sAddEdit_ProcedureNameItemDetails);
                    if (responseItems != null)
                    {

                        foreach (var obj in responseItems)
                        {
                            dynamic dynamicObj = obj;

                            



                            if (Items == null)
                            {
                                Items = "{" +
                    "\"AttribDtls\": [ " +
                     "   {" +
                     "       \"Nm\": \"" + dynamicObj.ItemName.ToString() + "\"," +
                     "       \"Val\": \"10000\"" +
                     " }  " +
                    "]," +


                   " \"OrgCntry\": null," +
                   " \"OrdLineRef\": null," +
                   " \"TotItemVal\": " + dynamicObj.TotalItemVal.ToString() + "," +
                   " \"OthChrg\": 0," +
                   " \"StateCesNonAdvlAmt\": 0," +
        "            \"StateCesAmt\": 0," +
        "            \"StateCesRt\": 0," +
         "           \"CesNonAdvlAmt\": 0," +
          "          \"CesAmt\": 0," +
           "         \"CesRt\": 0," +
            "        \"SgstAmt\": " + dynamicObj.SGST.ToString() + "," +
             "       \"CgstAmt\": " + dynamicObj.CGST.ToString() + "," +
              "      \"IgstAmt\": " + dynamicObj.IGST.ToString() + "," +
               "     \"Qty\": " + dynamicObj.Qty.ToString() + "," +
                "    \"AssAmt\": " + dynamicObj.Amount.ToString() + "," +
                 "   \"PreTaxVal\": 0," +
        "            \"Discount\": 0.00," +
        "            \"TotAmt\": " + dynamicObj.Amount.ToString() + "," +
        "            \"UnitPrice\": " + dynamicObj.Rate.ToString() + "," +
         "           \"Unit\": \"NOS\"," +
         "           \"FreeQty\": 0," +
         "           \"GstRt\": " + dynamicObj.GstRate.ToString() + "," +
         "           \"Barcde\": \"123456\"," +


         "           \"HsnCd\": \"" + dynamicObj.HSNCode.ToString() + "\"," +
          "          \"IsServc\": \""+dynamicObj.IsService.ToString()+"\"," +
          "          \"PrdDesc\": \"" + dynamicObj.ItemName.ToString() + "\"," +
          "          \"SlNo\": \"" + dynamicObj.SerialNo.ToString() + "\"" +
           "     }";

                            }



                            else
                            {
                                Items = Items + "," + "{" +
                    "\"AttribDtls\": [ " +
                     "   {" +
                     "       \"Nm\": \"" + dynamicObj.ItemName.ToString() + "\"," +
                     "       \"Val\": \"10000\"" +
                     " }  " +
                    "]," +


                   " \"OrgCntry\": null," +
                   " \"OrdLineRef\": null," +
                   " \"TotItemVal\": " + dynamicObj.TotalItemVal.ToString() + "," +
                   " \"OthChrg\": 0," +
                   " \"StateCesNonAdvlAmt\": 0," +
        "            \"StateCesAmt\": 0," +
        "            \"StateCesRt\": 0," +
         "           \"CesNonAdvlAmt\": 0," +
          "          \"CesAmt\": 0," +
           "         \"CesRt\": 0," +
            "        \"SgstAmt\": " + dynamicObj.SGST.ToString() + "," +
             "       \"CgstAmt\": " + dynamicObj.CGST.ToString() + "," +
              "      \"IgstAmt\":" + dynamicObj.IGST.ToString() + "," +
               "     \"Qty\": " + dynamicObj.Qty.ToString() + "," +
                "    \"AssAmt\": " + dynamicObj.Amount.ToString() + "," +
                 "   \"PreTaxVal\": 0," +
        "            \"Discount\": 0.00," +
        "            \"TotAmt\": " + dynamicObj.Amount.ToString() + "," +
        "            \"UnitPrice\": " + dynamicObj.Rate.ToString() + "," +
         "           \"Unit\": \"NOS\"," +
         "           \"FreeQty\": 0," +
         "           \"GstRt\": " + dynamicObj.GstRate.ToString() + "," +
         "           \"Barcde\": \"123456\"," +


         "           \"HsnCd\": \"" + dynamicObj.HSNCode.ToString() + "\"," +
          "          \"IsServc\": \""+ dynamicObj.IsService.ToString() + "\"," +
          "          \"PrdDesc\": \"" + dynamicObj.ItemName.ToString() + "\"," +
          "          \"SlNo\": \"" + dynamicObj.SerialNo.ToString() + "\"" +
           "     }";




                            }



                        }
                    }

                    var Res = CallAPI();



                    if (mModel.Id == 1)
                    {
                        dbPara.Add("F_InvoiceMasterH", dataReceived.F_InvoiceMasterH);
                        dbPara.Add("IRN", IRN);
                        dbPara.Add("AckNo", Ackno);
                        dbPara.Add("AckDt", AckDt);
                        dbPara.Add("SignedQr", SignedQrCode);

                        var reso = await _svc.Login(dbPara: dbPara, "UpdateResponse");
                    }


                    /****/
                    data = mModel;
                        
                        return Ok(new Response { Success = true, Status = StatusCodes.Status200OK, Message = "Record " + (Id == 0 ? "added." : "updated"), Data = new { data } });

                }

                return NotFound(new Response { Success = false, Status = StatusCodes.Status404NotFound, Message = "Not Found" });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new Response { Success = false, Status = StatusCodes.Status500InternalServerError, Message = ex.Message });
            }
        }




    }
} 