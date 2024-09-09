function myFunction() {
    // Declare variables
    var input = document.getElementById('myInput');
    var filter = input.value.toUpperCase();
    var ul = document.getElementById("myUL");
    var li = ul.getElementsByTagName('li');

    // Loop through all list items, and hide those who don't match the search query
    for (var i = 0; i < li.length; i++) {
        var a = li[i].getElementsByTagName("a")[0];
        var txtValue = a.textContent || a.innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
            li[i].style.display = "";  // Show the matching item
        } else {
            li[i].style.display = "none";  // Hide non-matching items
        }
    }
}
