
const request = require('request');
const Url = require('url');
const cheerio = require('cheerio');
const _ = require('lodash');
const fs = require('fs');
const moment = require('moment');

const CART_IDS = ['#addToCart', '#handleBuy'];
const PRICE_ELEMENTS = ['#priceblock_ourprice', '#priceblock_saleprice', '#priceBlock .priceLarge', '#actualPriceContent .priceLarge', '#actualPriceValue .priceLarge'];
const MULTIPLE_OFFERS_ELEMENTS = ['#buybox-see-all-buying-choices-announce'];
const SIZE_ELEMENTS = ['#variation_size_name'];
const AVAILABILITY_ID = ['#outOfStock', '#availability', '.availRed'];
const QUANTITY = '999';

const getRequest = (params, callback) =>  {
    let url = params.url,
        encoding = params.encoding,
        timeout = params.timeout,
        proxy = params.proxy,
        createJar = params.createJar,
        cookieJar = '';
    if(proxy == null){
      params.proxy = ''
    }
    if(createJar == true){
        cookieJar = request.jar();
        params.jar = cookieJar;
    }
    request(params, function(error, response, body){
        if(error) {
            console.log('Error, retrying')
            callback(error);
        }

        return callback(error, response, body, cookieJar);
    });
}

const scrapeAmazonProductPage = (params) => {

    return new Promise((resolve, reject) => {

        getRequest(params, (error, response, body, cookieJar) => {
            if(error){
                return reject({error:'CONNECT_ERROR'});
            } else if (response.statusCode == 404){
                return reject({error: response.statusCode, payload : body});
            }

            let url = params.url;
            let rootUrl = Url.parse(url);

            let $ = cheerio.load(body);
            let postData = {};

            let merchantId = $('#merchantID').val();

            if(category == 'apparel' || category == 'shoes') {
              return reject({error : 'MULTIPLE_SIZES'});
            }

            if($('#native_dropdown_selected_size_name').length > 0 && $('#variation_color_name').length > 0){
              return reject({error : 'MULTIPLE_SIZES'});
            }
            let allOffers = _.find(MULTIPLE_OFFERS_ELEMENTS, function(id){
                return $(id).length > 0;
            });
            let cartId = _.find(CART_IDS, function(id){
                return $(id).length > 0;
            });

            let sizeId = _.find(SIZE_ELEMENTS, function(id){
                return $(id).length > 0;
            });

            let priceId = _.find(PRICE_ELEMENTS, function(id){
                return $(id).length > 0;
            });

            if(allOffers){
                return reject({error : 'MULTIPLE_OFFERS'})
            }else if(!cartId) {
                return reject({error : 'NOCART_ID'});
            } else if($(sizeId).is('select')) {
                return reject({error : 'MULTIPLE_SIZES'});
            }else if(!priceId){
                return reject({error : 'NO_PRICE'});
            }

            let availabilityId = _.find(AVAILABILITY_ID, function(id){
                return $(id).length > 0;
            });

            let availability = $(availabilityId).text().trim();

            if(availability.match(/(Actuellement indisponible|No disponible|Unavailable)/g)){
                console.log('indisponible')
                return reject({error : 'PRODUCT_UNAVAILABLE'});
            }


            let numReviews = parseInt($('#acrCustomerReviewText').text());
            let category = $('#storeID').val();
            // return console.log(availability)

            if(!numReviews) {
                numReviews = 0
            }
            //Form building part, we get the info to post with the serialiazeArray func
            //And we add a few other params
            let array = $(cartId).serializeArray();
            console.log($(priceId).text());
            let productPrice = $(priceId).text().replace('EUR', '').replace(',', '.').replace('£', '').replace('Â', '').replace('$', '').replace('€', '').trim();

            console.log(productPrice);

            let cart = $(cartId);

            if(cart.length < 1){
                return reject({error: 'NO_CART'})
            }

            // console.log( $(cartId).attr('action'))
            let formUrl = $(cartId).attr('action');

            //Check if the url has https and a full url.
            if(formUrl.indexOf('https://www.amazon') < 0) {
              formUrl = formUrl.replace('https://' + rootUrl.host, '');
              formUrl = "https://" + rootUrl.host + formUrl;
            }

            _.each(array, function(object){
                postData[object.name] = object.value;
            });


            postData['quantity'] = QUANTITY;
            // postData['submit.add-to-cart'] = $('#add-to-cart-button').val();

            let salesRank = '';

            let salesRankItem = $('.zg_hrsr_item .zg_hrsr_rank').first();
            let match = body.match(/(Classement des meilleures ventes d'Amazon|Clasificación en los más vendidos de Amazon|Amazon Bestsellers Rank|Best Sellers Rank)(.|\n)*?<a/g);
            if(match){
                salesRank = match[0]
                .match(/\d+(?:(\.|,)\d+|)/g)[0]
                .replace('.','')
                .replace(',', '');
                console.log('Match sale rank ' + salesRank)
                if(salesRankItem && salesRank == 0){
                    salesRank = $(salesRankItem).text().replace('#', '').replace('.','').replace(',', '');
                    salesRank = parseInt(salesRank).toString();
                    console.log('Sales rank' + salesRank);
                }

            }else{
                salesRank = '99999';
            }

            console.log('The sales rank is ' + salesRank);
            resolve({salesRank, productPrice, numReviews, merchantId, formUrl, postData, cookieJar});
        });
    });
}

let getAmazonInventoryInfo = (requestParams, productInfo) => {

    let productPrice = productInfo.productPrice;
    let salesRank = productInfo.salesRank;
    let numReviews = productInfo.numReviews;
    let merchantId = productInfo.merchantId;
    return new Promise((resolve, reject) => {
        getRequest(requestParams, function(error, response, body){
            if(error){
                return reject({error : 'CONNECT_ERROR'});
            } else if(response.statusCode == 404){
                return reject({error : response.statusCode})
            }
            let $ = cheerio.load(body);
            if(body.match(/(Veuillez confirmer que|Confirma que quieres|Please confirm|faut que nous nous assurions que vous)/g)){
                console.log('Confirmation error, retrying');
                return reject({error : 'CONFIRMATION_ERROR'});
            }else if(body.match(/(Votre mise à jour a)/g)){
                console.log('Error mise à jour');
                return reject({error : 'REQUEST_ERROR'});

            }
            let date = moment().format('YYYY-MM-D');
            let yesterday = moment().add(-1, 'days').format('YYYY-MM-D');


            //Checking if the inventory is present on the page
            //If not it means we cannot know the exact value
            let inventory;
            let alertBox = $('#huc-v2-box-warning');
            let confirmText = $('#confirm-text');
            // Checking the inventory available or if there is a limit per product
            if(alertBox.length > 0) {
                let match = body.match(/(?:de los|a que|than the) ([0-9]+) (?:disponibles|de disponible|available)/);
                let match2 = body.match(/(?:limite de vente de|limit of) ([0-9]+) (?:articles|per customer)/)
                if(match) {
                    inventory = match[1]
                }
                else if(match2){
                    console.log('indisponible, limite de ventes')
                    return reject({error: 'SALES_LIMITED'});

                }
            } else if(confirmText.length > 0) {
                inventory = confirmText.text().trim();
            } else {
                let match = body.match(/\((([^)]+ (articles|article|producto|productos|items|item)))\)/g);
                if(match) inventory = match[0];
            }


            console.log('The inventory is ' + inventory);

            if(!inventory) {
              fs.writeFileSync(productInfo.asin+"NOINV.html", body)

                return reject({error : 'UNKNOWN_INVENTORY'});

            }
            let remainingInvDiv = $('#hucArgsNewItems');

            let numInventory  = inventory.replace('(', '').replace(')', '').replace('articles', '').replace('article', '').replace('items', '').replace('item', '');
            numInventory = parseInt(numInventory);
            if(remainingInvDiv.length < 1){
                // fs.writeFileSync(productInfo.asin+"NOREMAININGDIV.html", body)
            } else {
                remainingInvDiv = $(remainingInvDiv).val().split(',')[1];
                if(remainingInvDiv != numInventory) {
                    return reject({error : 'INCORRECT_INVENTORY'});
                }

            }

            let saleObject = {
                date : date,
                inventory : numInventory,
                price : productPrice,
                sales_rank : salesRank,
                merchant_id : merchantId,
                num_reviews : numReviews,
            }
            return resolve(saleObject);



        });

    })

}

exports.scrapeAmazonProductPage = scrapeAmazonProductPage;
exports.getAmazonInventoryInfo = getAmazonInventoryInfo;
