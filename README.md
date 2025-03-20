# GST Return Filing Assistant

A web-based tool designed to help Flipkart sellers process and generate GST return data efficiently. This application simplifies the process of handling B2CS transactions, HSN data, and document issues for GST returns.

## Features

- **State-wise GST Processing**: Supports all Indian states and union territories
- **B2CS Transaction Handling**: Processes B2CS (Business to Consumer Small) transactions
- **HSN Data Management**: Handles HSN (Harmonized System of Nomenclature) code processing
- **Document Issue Tracking**: Manages invoice series and document numbering
- **Automatic Tax Calculation**: Calculates IGST, CGST, and SGST automatically
- **User-friendly Interface**: Simple upload and process workflow

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/gst-return.git
   ```

2. Navigate to the project directory:
   ```bash
   cd gst-return
   ```

3. Open `index.html` in your web browser

## Usage

1. Open the application in your web browser
2. Select your GST state from the dropdown menu
3. Upload your Excel file containing GST data
4. The application will automatically process and generate the required GST return data

## Project Structure

```
.
├── css/
│   └── styles.css
├── js/
│   ├── main.js
│   ├── return1/
│   │   ├── b2cs.js
│   │   └── hsn.js
│   ├── utils.js
│   └── xlsx.full.min.js
└── index.html
```

## Dependencies

- XLSX.js for Excel file processing

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.