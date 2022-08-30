// --------------------- CONSTANTS ---------------------
const taxes = {
  BC: 0.12,
  AB: 0.05,
  MB: 0.12,
  NB: 0.15,
  NL: 0.15,
  NT: 0.05,
  NS: 0.15,
  NU: 0.05,
  ON: 0.13,
  PE: 0.15,
  QC: 0.14975,
  SK: 0.11,
  YT: 0.05
}

const base_shipping = 2.5

// --------------------- INITIALIZE ---------------------
$(document).ready(()=> {
  // instantiate catalog to populate page
  let cata = new Catalog()
  
  // hide the shipping section of the form
  $('#shipping').hide()

  // show and hide shipping with click event
  $(`input[name=billingIsShipping]`).click((e)=>
  {
    let state = e.target.checked
    if(state)
    {
      $('#shipping').hide()
    } else {
      $('#shipping').show()
    }
  })

  // Form validation hooks

  // to prevent form submission when hitting enter
  $('form input').keydown(function (e) {
    if (e.keyCode == 13) {
        e.preventDefault();
        return false;
    }
  });
  
  // click event for emptying cart
  $('#emptyCart').click(()=>
  {
    cata.cart = {}
    cata.updateCartListings()
    cata.cartToCookie()
  })
  
  // validation for email structure on keyup event
  $('input[name=email]').keyup((event)=>
  {
    if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(event.target.value))
    {
      isValid('email')
    } else {
      isInvalid('email', 'Please enter a valid email address')
    }
  })

  // validation for length numeric strictness on keyup event
  $('input[name=phone]').keyup((e)=>
  {
    let value = e.target.value.replace(/[-. \(\)]/g, '');
    if(/^[0-9]{10,11}$/.test(value))
    {
      isValid('phone')
    } else {
      isInvalid('phone', 'Please enter a valid phone number')
    }
  })

  // Autocomplete for address (1 is billing, 2 is shipping) on keyup event
  $('input[name=address1]').keyup((e)=>autoCompleteAddress(e, 1, cata))
  $('input[name=address2]').keyup((e)=>autoCompleteAddress(e, 2, cata))
  
  // Credit card number validation and testing for different card types on keyup event
  $('input[name=cNum]').keyup((e)=>
  {
    //get card number
    let cnum = e.target.value.replace(/\s/g, '');
    if(cnum.length >= 3)
    {
      let cardType = cnum.substring(0, 1)
      // test different regex for different card numbers
      switch(cardType)
      {
        case '3': 
        if(/^[0-9]{15}$/.test(cnum))
        {
          if(luhnCheck(cnum))
            {
              // show that card is valid
              isValid('cNum')
              break
            }
          }
          // show invalid card info 
          isInvalid('cNum', "Please enter a valid American Express card number")
          break
        case '4':
          if(/^[0-9]{16}$/.test(cnum))
          {
            if(luhnCheck(cnum))
            {
              // show that card is valid
              isValid('cNum')
              break
            }
          }
          // show invalid card info 
          isInvalid('cNum', "Please enter a valid Visa card number")
          break
        case '5':
          if(/^[0-9]{16}$/.test(cnum))
          {
            if(luhnCheck(cnum))
            {
              // show that card is valid
              isValid('cNum')
              break
            }
          }
          // show invalid card info 
          isInvalid('cNum', "Please enter a valid Mastercard card number")
          break
        default: {
          isInvalid('cNum', "Please enter a valid Credit card number")
        }
      }
    }
  })

  // Expirey validation for month
  $('select[name=expirey_month]').change((e)=>
    {
      let month = e.target.value
      let year = $('select[name=expirey_year]').val()
      let currentMonth = new Date().getMonth() + 1
      let currentYear = new Date().getFullYear().toString()
      currentMonth = currentMonth < 10 ? '0' + currentMonth : currentMonth
      if((currentMonth > month && currentYear == year) || currentYear > year)
      {
        isInvalid('expirey_month', 'Card is expired')
        isInvalid('expirey_year', 'Card is expired')
      } else {
        isValid('expirey_month')
        isValid('expirey_year')
      }
    })
  
  // Validate length of security code
  $('input[name=secureCode]').change((e)=>
  {
    let value = e.target.value
    if(value.length < 3)
    {
      isInvalid('secureCode', "Please enter a valid CVV number")
    } else {
      isValid('secureCode')
    }
  })

  // use testMinLength function to validate the field is not blank
  $('input[name=fName]').keyup((e)=>testMinLength(e))

  $('input[name=lName]').keyup((e)=>testMinLength(e))

  $('input[name=billingName]').keyup((e)=>testMinLength(e))
  
  for(let i = 1; i <= 2; i++)
  {
    $(`input[name=address${i}]`).keyup((e)=>testMinLength(e))
    $(`input[name=city${i}]`).keyup((e)=>testMinLength(e))
    $(`input[name=country${i}]`).keyup((e)=>testMinLength(e))
    $(`input[name=prov${i}]`).keyup((e)=>testMinLength(e))
    $(`input[name=postal${i}]`).keyup((e)=>testMinLength(e))
  }

  // Form completion
  $('#billingForm').keyup(()=>
  {
    // remove three from total to ignore the non required elements (alt address, checkbox, and currency selector)
    const SumOfFormElements = $('input, select').length - 4
    console.log(SumOfFormElements)
    let total = 0
    // counting all is-valid classes to total number of form elements
    $('.is-valid').each(()=>
    {
        total += 1
    })
    console.log(total)
    if(total == SumOfFormElements)
    {
      $('#submitButton')
      .removeAttr('disabled')
    }
  })

  // On submit prevent default and create new order class and post to submission endpoint
  $('#billingForm').submit((event)=>
  {
    event.preventDefault()
    let nOrder = new Order(cata)
    nOrder.postOrder()
  })

  // Fetch and populate currency information from API
  fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/cad.json`)
  .catch(err=>
    {
      console.err(`Caught: ${err}`)
      fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/cad.min.json`)
      .then(res=>res.json())
      .then(res=>{
        conversions = res.cad
        $('#usd').attr('value', conversions.usd)
        $('#euro').attr('value', conversions.eur)
      })
    })
  .then(res=>res.json())
  .then(res=>{
    conversions = res.cad
    $('#usd').attr('value', conversions.usd)
    $('#euro').attr('value', conversions.eur)
  })
  $(`#currencySelect`).change(()=>{
    cata.updatePrices()
  })
})

// --------------------- CLASSES ---------------------
class Order
{
  constructor(catalog)
  {
    const cartItems = catalog.getCartItems()
    this.order = { 
      card_number:$('input[name=cNum]').val(),
      expiry_month:$('select[name=expirey_month]').val(),
      expiry_year:$('select[name=expirey_year]').val(),
      security_code:$('input[name=secureCode]').val(),
      amount:parseFloat($(`.total`).text().split(`$`)[1]),
      taxes:taxes[$('input[name=prov2]').val()],
      shipping_amount:parseFloat($('.shipping').first().text().split('$')[1]),
      currency:$("select option:selected").text().split(' ')[0].toLowerCase(),
      items: cartItems,
      billing: {
        first_name:$('input[name=billingName]').val().split(' ')[0] || $('input[name=fName]').val(),
        last_name:$('input[name=billingName]').val().split(' ')[1] || $('input[name=lName]').val(),
        address_1:$('input[name=address1]').val(),
        address_2:$('input[name=altAddress1]').val(),
        city:$('input[name=city1]').val(),
        province:$('input[name=prov1]').val(),
        country:$('input[name=country1]').val() == 'Canada' ? 'CA' : 'US',
        postal:$('input[name=postal1]').val(),
        phone:$('input[name=phone]').val(),
        email:$('input[name=email]').val(),
      },
      shipping: {
        first_name:$('input[name=fName]').val(),
        last_name:$('input[name=lName]').val(),
        address_1:$('input[name=address2]').val(),
        address_2:$('input[name=altAddress2]').val(),
        city:$('input[name=city2]').val(),
        province:$('input[name=prov2]').val(),
        country:$('input[name=country2]').val() == 'Canada' ? 'CA' : 'US',
        postal:$('input[name=postal2]').val(),
      }
    }
  }

  postOrder()
  {
    let form_data = new FormData();
    form_data.append('submission', JSON.stringify(this.order));
    fetch('' // post url for order data, 
    { method: "POST", 
      cache: 'no-cache', 
      body: form_data
    }).then((res)=>
    { 
      res.json()
      .then((json)=>
      {
        if(json.status != "SUCCESS")
        {
          $('body').append(
            `
            <div class="modal" tabindex="-1" id="errorModal">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title">Error Order Failed</h5>
                  </div>
                  <div class="modal-body">
                    <ul id="errorBody">
                    </ul>
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                  </div>
                </div>
              </div>
            </div>
            `
          )
          Object.keys(json.error).forEach((key) => {
            if(!(key == 'billing' || key == 'shipping'))
            {
              $('#errorBody').append(`<li><b>${key}:</b> ${json.error[key]}</li>`)
            }
          })

          $('#errorModal').modal('show')
        } else {
          $('body').append(
            `
            <div class="modal" tabindex="-1" id="successModal">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title">Order Completed</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                      <span aria-hidden="true">&times;</span>
                    </button>
                  </div>
                  <div class="modal-body">
                    <p>Order Placed, you will never recieve this item since it's not a real site...</p>
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                  </div>
                </div>
              </div>
            </div>
            `
          )

          $('#successModal').modal('show')
        }
      })
    })
    
  }
}

class Catalog
{
  /**
   * Generates product catalog and fetches data.
   * @Constructor
   */
  constructor()
  {
    this.getCartFromCookie() // get a cart if one is saved in cookies
    this.item_list = [] // reference list of products
    this.conversion = $(`#currencySelect`).val() || 1 // set the conversion rate for currency
    this.currencySymbol = '$' // set the default currency symbol
    $('#output').text('')
    fetch('https://fakestoreapi.com/products') //fetch products
    .catch(err => {
      console.error(`Caught exception: ${err}`)
      fetch(``) // fallback fetch if first api is down
      .then(res=>res.json())
      .then(res=>res.forEach((product, i) => {
          // for each product append html of the product data and add it to the reference list
          this.makeProductListing(product, i)
          this.item_list.push(product)
        }))
      .then(()=>{
        // generate the HTML for products in the cart
        this.loadCart()
      })
    })
    // when there is no fallback catch and API is responsive
    .then(res=>res.json())
    .then(res=>res.forEach((product, i) => {
          // for each product append html of the product data and add it to the reference list
        this.makeProductListing(product, i)
        this.item_list.push(product)
      }))
    .then(()=>{
      // generate the HTML for products in the cart
      this.loadCart()
    })
  }

  /**
   * Take a product object and populate a template to append to output.
   * 
   * Use index to make unique id names for later reference.
   * 
   * @param {object} product 
   * @param {number} index 
   */
  makeProductListing(product, index)
  {
    const {title, description, image, price} = product
    $('#output').append(`
      <li class="list-group-item" id="prod-${index}">
        <div class="media align-items-lg-center row ">
          <div class="col-md-2">
            <img src="${image}" alt="${title}" class="img-fluid ml-lg-5">
          </div>
          <div class="media-body col-lg-7">
            <h5 class="mt-0 font-weight-bold mb-2">${title}</h5>
            <div class="d-flex align-items-center justify-content-between mt-1">
              ${description}
            </div>
          </div>
          <div class="col">
            <h6 class="font-weight-bold my-2" id="price-${index}">${this.currencySymbol}${parseFloat((price  * this.conversion)).toFixed(2)}</h6>
            <button type="button" class="btn btn-primary mt-2" id="add-to-cart-${index}">Add to Cart</button>
          </div>
        </div>
      </li>
    `)
    // set event for this instance of the product
    $(`#add-to-cart-${index}`).click(() => {
      // Update cart
      if(this.cart == null)
      {
        this.cart = {}
      }
      if(this.cart[index] == undefined)
      {
        this.cart[index] = 0
      }
      this.cart[index]++

      // button will change to green
      $(`#add-to-cart-${index}`).toggleClass('btn-primary')
      $(`#add-to-cart-${index}`).toggleClass('btn-success')

      // after 1 second the button will turn blue
      setTimeout(()=> {
        $(`#add-to-cart-${index}`).toggleClass('btn-primary')
        $(`#add-to-cart-${index}`).toggleClass('btn-success')
      }, 1000)

      // updating the html in the checkout modal
      this.updateCartListings()
      // save current cart to cookie
      this.cartToCookie()
    })
  }

  /**
   * Save current cart to cookie.
   */
  cartToCookie()
  {
    set_cookie("shopping_cart_items", this.cart);
  }

  /**
   * Load current cart with data from cookie.
   */
  getCartFromCookie()
  {
    this.cart = get_cookie("shopping_cart_items");
    if(this.cart === null) 
    {
      this.cart = {}
    }
  }

  /**
   * Gets the total of the cart based on the current currency selected
   * and sum of cart prices.
   * 
   * @returns number
   */
  getTotal()
  {
    let total = 0
    this.conversion = $(`#currencySelect`).val()
    Object.entries(this.cart).forEach(([index, count]) => {
      // item does not exist in cart
      let product = this.item_list[index]
      total += (product.price * count)
    })
    total = total * this.conversion
    return parseFloat(total).toFixed(2)
  }

  /**
   * Updates all prices in the reference list of items to the coverted price
   * when the currency is changed
   */
  updatePrices()
  {
    this.currencySymbol = $("select option:selected").text().split(' ')[1].substring(0,1)
    this.getTotal()
    this.updateCartListings()
    this.item_list.forEach((prod, i)=>{
      $(`#price-${i}`).text(`${this.currencySymbol}${parseFloat((prod.price  * this.conversion)).toFixed(2)}`)
    })
  }

  /**
   * Update the html in the cart.
   * 
   * Updates buttons as disabled or not depending on cart
   * content.
   */
  updateCartListings()
  {
    if(this.cart != null)
    {
      const cartSize = Object.keys(this.cart).length
      if(cartSize == 0)
      {
        $('#billing')
        .attr('disabled','disabled')
        .toggleClass('btn-primary')
        .toggleClass('btn-secondary')

        $('#emptyCart')
        .attr('disabled','disabled')
        .toggleClass('btn-primary')
        .toggleClass('btn-secondary')
      } else if($('#billing').attr('disabled') == 'disabled') {
        $('#billing')
        .removeAttr('disabled')
        .toggleClass('btn-primary')
        .toggleClass('btn-secondary')
        
        $('#emptyCart')
        .removeAttr('disabled')
        .toggleClass('btn-primary')
        .toggleClass('btn-secondary')
      }
      $('#cartOutput').text('')
      Object.entries(this.cart).forEach(([index, count]) => {
        const {title, image, price} = this.item_list[index] // use reference list to get object
        $('#cartOutput').append(`
          <li class="list-group-item" id="cart-${index}">
            <div class="media align-items-lg-center row ">
              <div class="col-md-3">
                <img src="${image}" alt="${title}" width="60" class="img-fluid ml-lg-5 order-1 order-lg-2">
              </div>
              <div class="media-body col">
                <h5 class="mt-0 font-weight-bold mb-2">${title}</h5>
                <div class="d-flex align-items-center justify-content-between mt-1">
                  <h6 class="font-weight-bold my-2" id="cart-price-${index}">${this.currencySymbol}${parseFloat((price  * this.conversion) * count).toFixed(2)}</h6>
                </div>
              </div>
              <div class="col">
                <p class="float-end" id="quantity-${index}">Quantity: ${count}</p>
                <button type="button" class="btn btn-danger mt-2 float-end" id="remove-${index}">Remove</button>
              </div>
            </div>
          </li>
          `)
        // add click event handler for removing this product from cart
        $(`#remove-${index}`).click(()=>{
          // remove one of the values
          this.cart[index]--
          if(this.cart[index] <= 0)
          {
            delete this.cart[index]
          }
          this.updateCartListings()
          this.cartToCookie()
        })
      })
      // update total
      $('.total').text(`${this.currencySymbol}${this.getTotal()}`)
    } else {
      $(`#cartOutput`).text('')
    }
  }

  /**
   * Gets from the cart a list of product objects for form submission.
   * 
   * @returns [object]
   */
  getCartItems()
  {
    let result = []
    Object.entries(this.cart).forEach(([index, count]) => {
      for(let i = 0; i < count; i++)
      {
        result.push(this.item_list[index])
      }
    })
    return result
  }

  /**
   * Load the cart from cookie and update html of cart.
   */
  loadCart()
  {
    this.getCartFromCookie()
    this.updateCartListings()
  }
}

// --------------------- FUNCTIONS ---------------------

/**
 * Fetches from an event an autocomplete for addresses to use.
 * 
 * Once an address is selected and calculating shipping and taxes is done.
 * 
 * @param {object} e the event
 * @param {number} id the id for shipping or billing sections
 * @param {object} cata reference to the catalog class
 */
function autoCompleteAddress(e, id, cata)
{
  fetch(`https://geocoder.ca/?autocomplete=1&geoit=json&auth=test&json=1&locate=${e.target.value}`)
    .catch(err=>
      {
        console.err(`Caught: ${err}`)
      })
    .then(res=>res.json())
    .then(res=>{
      if(res.streets.street != undefined)
      {
        const street = res.streets.street
        $(`#address${id}Datalist`).html("")
        if(Array.isArray(street))
        {
          street.forEach((location)=>
          {
            $(`#address${id}Datalist`).append(`<option>${location}</option>`)
          })
        } else {
          $(`#address${id}Datalist`)
          .html(`<option>${street}</option>`)
          if(street === $(`input[name=address${id}]`).val())
          {
            let [address, city, prov, postal, ...rest] = street.split(`, `)
            let country = taxes[prov] ? 'Canada' : 'United States'
            $(`input[name=address${id}]`).val(address).addClass('is-valid').removeClass('is-invalid')
            $(`input[name=country${id}]`).val(country).addClass('is-valid')
            $(`input[name=city${id}]`).val(city).addClass('is-valid')
            $(`input[name=prov${id}]`).val(prov).addClass('is-valid')
            $(`input[name=postal${id}]`).val(postal).trigger("change").addClass('is-valid')
            
            if($('input[name=billingIsShipping')[0].checked)
            {
              $(`input[name=address2]`).val(address).addClass('is-valid')
              $(`input[name=country2]`).val(country).addClass('is-valid')
              $(`input[name=city2]`).val(city).addClass('is-valid')
              $(`input[name=prov2]`).val(prov).addClass('is-valid')
              $(`input[name=postal2]`).val(postal).addClass('is-valid')
            }
            
            // calculate shipping and taxes
            let subtotal = 0
            let shipping = 0
            let items = cata.getCartItems()
            items.forEach((product)=>
            {
              subtotal += product.price * taxes[$(`input[name=prov2]`).val()]
              shipping += base_shipping
            })
            subtotal += shipping
            $(`.taxes`).text(`${parseInt(taxes[$(`input[name=prov2]`).val()] * 100)}%`)
            $(`.shipping`).text(`${cata.currencySymbol}${shipping}`)
            $(`.subtotal`).text(`${cata.currencySymbol}${parseFloat(subtotal).toFixed(2)}`)
            $(`.finalTotal`).text((parseFloat($(`.subtotal`).text().split(`$`)[1]) + parseFloat($(`.total`).text().split(`$`)[1])).toFixed(2))
          }
        }
      } else 
      {
        $(`#address${id}Datalist`).html("")
      }
      // trigger and update so form logic to enable submit is fired
      $('#billingForm').trigger('keyup')
    })
}

/**
 * Calculate with luhn equation if card number is valid.
 * 
 * @param {string} val the string value of a credit card number
 * @returns {boolean} true false if card is valid
 */
function luhnCheck(val) {
  let checksum = 0; // running checksum total
  let j = 1; // takes value of 1 or 2
  // Process each digit one by one starting from the last
  for (let i = val.length - 1; i >= 0; i--) {
    let calc = 0;
    // Extract the next digit and multiply by 1 or 2 on alternative digits.
    calc = Number(val.charAt(i)) * j;
    // If the result is in two digits add 1 to the checksum total
    if (calc > 9) {
      checksum = checksum + 1;
      calc = calc - 10;
    }

    // Add the units element to the checksum total
    checksum = checksum + calc;

    // Switch the value of j
    if (j == 1) {
      j = 2;
    } else {
      j = 1;
    }
  }

  //Check if it is divisible by 10 or not.
  return (checksum % 10) == 0;
}

/**
 * Set a form element with is-invalid and give it a mouse over message
 * to describe the error.
 * 
 * @param {string} name name value of the form element
 * @param {string} message message to show on mouse over
 */
function isInvalid(name, message)
{
  $(`[name=${name}]`).addClass(`is-invalid`)
  $(`[name=${name}]`).attr(`title`, message)
  $(`[name=${name}]`).removeClass(`is-valid`)
}

/**
 * Set a form element with is-valid.
 * 
 * @param {string} name name value of the form element
 */
function isValid(name)
{
  $(`[name=${name}]`).addClass(`is-valid`)
  $(`[name=${name}]`).removeAttr(`title`)
  $(`[name=${name}]`).removeClass(`is-invalid`)
}

/**
 * Test if the target of the event object is of a min length.
 * 
 * @param {object} e event object
 */
function testMinLength(e)
{
  let value = e.target.value.replace(/\s/g, '')
  if(/^[0-9a-zA-Z]{2,}$/.test(value))
  {
    isValid(e.target.name)
  } else {
    isInvalid(e.target.name, 'This field is required')
  }
}