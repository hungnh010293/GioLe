
// Khai báo biến churches ở scope toàn cục
let churches = [];

// Thêm biến để lưu trữ trạng thái filter
let currentFilters = {
    searchTerm: '',
    district: '',
    selectedTimes: [],
    activeDay: 'weekday'
};

document.addEventListener('DOMContentLoaded', async function () {
    // Fetch churches data
    try {
        const response = await fetch('./churches.json');
        churches = await response.json();
        
        // Sau khi có dữ liệu, render time slots mặc đnh
        renderTimeSlots('weekday');
        
        // Extract districts and populate select
        const districts = [...new Set(churches.map(church => {
            const address = church.address;
            const districtMatch = address.match(/Q\.\s*(\d+|[^,]+)|Quận\s*(\d+|[^,]+)|Huyện\s*([^,]+)/i);
            return districtMatch ? districtMatch[0].trim() : 'Khác';
        }))].sort();

        // Populate district select
        const districtSelect = document.querySelector('.filter-select');
        districtSelect.innerHTML = '<option value="">Tất cả quận</option>' +
            districts.map(district => `<option value="${district}">${district}</option>`).join('');

        // Initial table population
        populateTable();

        // Add event listeners
        document.querySelector('.search-input').addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const filteredChurches = churches.filter(church => 
                church.name.toLowerCase().includes(searchTerm) ||
                church.address.toLowerCase().includes(searchTerm)
            );
            populateTable(filteredChurches);
        });

        districtSelect.addEventListener('change', function() {
            const selectedDistrict = this.value.toLowerCase();
            const filteredChurches = selectedDistrict ? 
                churches.filter(church => 
                    church.address.toLowerCase().includes(selectedDistrict)
                ) : churches;
            populateTable(filteredChurches);
        });

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderTimeSlots(tab.dataset.day);
            });
        });

    } catch (error) {
        console.error('Error loading churches data:', error);
    }
});

function getUniqueMassTimes(churches, dayType) {
    const times = new Set();
    
    churches.forEach(church => {
        switch(dayType) {
            case 'weekday':
                // Lấy giờ từ thứ 2 đến thứ 6
                ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
                    church.massTimes[day]?.forEach(time => times.add(time));
                });
                break;
            case 'saturday':
                church.massTimes.saturday?.forEach(time => times.add(time));
                break;
            case 'sunday':
                church.massTimes.sunday?.forEach(time => times.add(time));
                break;
        }
    });

    // Loại bỏ giá trị rỗng và sắp xếp theo thời gian
    return Array.from(times)
        .filter(time => time && time.trim())
        .sort((a, b) => {
            const timeA = a.split(':').map(Number);
            const timeB = b.split(':').map(Number);
            return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
        });
}

function renderTimeSlots(day) {
    const timeSlotsContainer = document.querySelector('.time-slots');
    timeSlotsContainer.innerHTML = '';

    const times = getUniqueMassTimes(churches, day);
    
    times.forEach(time => {
        const slot = document.createElement('div');
        slot.className = 'time-slot';
        slot.innerHTML = `
            <input type="checkbox" id="time-${time}" value="${time}">
            <label for="time-${time}">${time}</label>
        `;
        timeSlotsContainer.appendChild(slot);
    });

    // Thêm event listener cho các checkbox
    timeSlotsContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', filterChurches);
    });
}

function filterChurches() {
    const selectedTimes = Array.from(document.querySelectorAll('.time-slot input:checked'))
        .map(input => input.value);
    const activeDay = document.querySelector('.tab.active').dataset.day;
    const searchTerm = document.querySelector('.search-input').value.toLowerCase();
    const selectedDistrict = document.querySelector('.filter-select').value;
    
    // Cập nhật trạng thái filter hiện tại
    currentFilters = {
        searchTerm,
        district: selectedDistrict,
        selectedTimes,
        activeDay
    };
    
    let filteredChurches = churches;

    // Nếu có chọn thời gian
    if (selectedTimes.length > 0) {
        filteredChurches = churches.filter(church => {
            switch(activeDay) {
                case 'weekday':
                    return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].some(day => 
                        church.massTimes[day]?.some(time => selectedTimes.includes(time))
                    );
                case 'saturday':
                    return church.massTimes.saturday?.some(time => selectedTimes.includes(time));
                case 'sunday':
                    return church.massTimes.sunday?.some(time => selectedTimes.includes(time));
                default:
                    return false;
            }
        });
    }

    if (searchTerm) {
        filteredChurches = filteredChurches.filter(church => 
            church.name.toLowerCase().includes(searchTerm) ||
            church.address.toLowerCase().includes(searchTerm)
        );
    }

    if (selectedDistrict) {
        filteredChurches = filteredChurches.filter(church => 
            church.address.toLowerCase().includes(selectedDistrict.toLowerCase())
        );
    }

    populateTable(filteredChurches);
}

// Show church details in modal
function showChurchDetails(church) {
    // Thông tin cơ bản
    document.getElementById('churchName').textContent = church.name;
    
    // Xử l hiển thị ảnh
    const imageUrl = `${church.image}`;
    const thumbnailImg = document.getElementById('churchImage');
    thumbnailImg.src = imageUrl;
    thumbnailImg.alt = church.name;
    
    // Thêm event listener cho ảnh thumbnail
    thumbnailImg.addEventListener('click', function() {
        const imageModal = document.getElementById('imageModal');
        const expandedImg = document.getElementById('expandedImg');
        expandedImg.src = imageUrl;
        imageModal.style.display = 'block';
    });

    // Thông tin chi tiết
    document.getElementById('churchAddress').textContent = church.address;
    document.getElementById('churchPatron').textContent = church.patron || 'Không có thông tin';
    document.getElementById('churchPhone').textContent = church.phone || 'Không có thông tin';
    document.getElementById('churchFoundedYear').textContent = church.foundedYear || 'Không có thông tin';

    // Sắp xếp thứ tự các ngày trong tuần
    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    // Hiển thị lịch thnh lễ
    const massSchedule = document.getElementById('massSchedule');
    massSchedule.innerHTML = dayOrder.map(day => {
        const times = church.massTimes[day] || [];
        return `
            <div class="mass-day">
                <h4>${getDayName(day)}</h4>
                <ul class="mass-time-list">
                    ${times.length > 0 
                        ? times.map(time => `<li>${time}</li>`).join('')
                        : '<li>Không có lễ</li>'
                    }
                </ul>
            </div>
        `;
    }).join('');

    // Hiển thị danh sách linh mục
    const priestsList = document.getElementById('priestsList');
    priestsList.innerHTML = `
        <div class="priests-grid">
            ${church.priests.map(priest => `
                <div class="priest-card">
                    <div class="priest-role">${priest.role}</div>
                    <div class="priest-name">${priest.name}</div>
                    <div class="priest-year">Từ năm ${priest.fromYear}</div>
                </div>
            `).join('')}
        </div>
    `;

    // Hiển thị danh sách Map
    const mapEmbedContainer = document.getElementById('mapEmbedContainer');

    // Kiểm tra nếu có mapembed
    if (church.mapembed) {
        mapEmbedContainer.innerHTML = `
            <div class="map-container">
                <iframe src="${church.mapembed}" 
                        width="100%" 
                        height="350" 
                        style="border:0;" 
                        allowfullscreen="" 
                        loading="lazy">
                </iframe>
            </div>
        `;
    } else {
        // Hiển thị thông báo nếu không có mapembed
        mapEmbedContainer.innerHTML = `
            <p class="map-placeholder">Đang cập nhật...</p>
        `;
    }  



    // Hiển thị modal
    document.getElementById('churchModal').style.display = 'block';
}

// Helper function để chuyển đổi tên ngày sang tiếng Việt
function getDayName(day) {
    const dayNames = {
        monday: 'Thứ 2',
        tuesday: 'Thứ 3',
        wednesday: 'Thứ 4',
        thursday: 'Thứ 5',
        friday: 'Thứ 6',
        saturday: 'Thứ 7',
        sunday: 'CN'
    };
    return dayNames[day] || day;
}

// Close modal
document.querySelector('.modal-close').addEventListener('click', () => {
    document.getElementById('churchModal').style.display = 'none';
});

// Populate table
function populateTable(filteredChurches = null) {
    // Nếu không có churches được truyền vào, sử dụng toàn bộ danh sách
    if (!filteredChurches) {
        filteredChurches = churches;
    }

    // Áp dụng các filter hiện tại
    if (currentFilters.district) {
        filteredChurches = filteredChurches.filter(church => 
            church.address.toLowerCase().includes(currentFilters.district.toLowerCase())
        );
    }

    if (currentFilters.searchTerm) {
        filteredChurches = filteredChurches.filter(church => 
            church.name.toLowerCase().includes(currentFilters.searchTerm) ||
            church.address.toLowerCase().includes(currentFilters.searchTerm)
        );
    }

    if (currentFilters.selectedTimes.length > 0) {
        filteredChurches = filteredChurches.filter(church => {
            switch(currentFilters.activeDay) {
                case 'weekday':
                    return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].some(day => 
                        church.massTimes[day]?.some(time => currentFilters.selectedTimes.includes(time))
                    );
                case 'saturday':
                    return church.massTimes.saturday?.some(time => currentFilters.selectedTimes.includes(time));
                case 'sunday':
                    return church.massTimes.sunday?.some(time => currentFilters.selectedTimes.includes(time));
                default:
                    return false;
            }
        });
    }

    const tbody = document.querySelector('tbody');
    const isMobile = window.innerWidth <= 768;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedChurches = filteredChurches.slice(startIndex, endIndex);

    tbody.innerHTML = paginatedChurches.map(church => {
        const district = church.address.match(/Q\.\s*(\d+|[^,]+)|Quận\s*(\d+|[^,]+)|Huyện\s*([^,]+)/i)?.[0] || 'Khác';
        
        if (isMobile) {
            const sundayMasses = church.massTimes.sunday?.length || 0;
            const saturdayMasses = church.massTimes.saturday?.length || 0;
            
            return `
                <tr onclick="showChurchDetails(${JSON.stringify(church).replace(/"/g, '&quot;')})">
                    <td>
                        <div class="church-card">
                            <div class="church-header">
                                <div class="church-icon">
                                    <i class="fas fa-church"></i>
                                </div>
                                <div class="church-info">
                                    <div class="church-name">${church.name}</div>
                                    <div class="church-location">
                                        <i class="fas fa-map-marker-alt"></i>
                                        ${district} • ${church.address.split(',')[0]}
                                    </div>
                                </div>
                            </div>
                            <div class="church-footer">
                                <div class="mass-stats">
                                    <div class="mass-badge">
                                        <i class="fas fa-sun"></i>
                                        CN: ${sundayMasses} lễ
                                    </div>
                                    <div class="mass-badge">
                                        <i class="fas fa-star"></i>
                                        T7: ${saturdayMasses} lễ
                                    </div>
                                </div>
                                <div class="view-more">
                                    Chi tiết
                                    <i class="fas fa-chevron-right"></i>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            return `
                <tr onclick="showChurchDetails(${JSON.stringify(church).replace(/"/g, '&quot;')})">
                    <td>${church.name}</td>
                    <td>${district}</td>
                    <td>${church.address}</td>
                    <td>${church.massTimes.sunday.join(', ')}</td>
                    <td>${church.massTimes.saturday.join(', ')}</td>
                </tr>
            `;
        }
    }).join('');

    setupPagination(filteredChurches);
}

// Cập nhật event listener resize
window.addEventListener('resize', debounce(() => {
    const oldIsMobile = window.innerWidth <= 768;
    const newIsMobile = window.innerWidth <= 768;
    
    // Chỉ re-render khi chuyển đổi giữa mobile và desktop
    if (oldIsMobile !== newIsMobile) {
        populateTable();
    }
}, 250));

// Thêm function debounce để tránh trigger quá nhiều lần
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Thêm event listeners cho modal ảnh
document.getElementById('imageModal').addEventListener('click', function() {
    this.style.display = 'none';
});

// Ngăn chặn việc đóng modal khi click vào ảnh
document.getElementById('expandedImg').addEventListener('click', function(e) {
    e.stopPropagation();
});

// Khai báo biến phân trang
let currentPage = 1;
const itemsPerPage = 10; // Số nhà thờ hiển thị trên mỗi trang

function setupPagination(filteredChurches = churches) {
    const totalPages = Math.ceil(filteredChurches.length / itemsPerPage);
    const pagination = document.querySelector('.pagination');
    
    // Tạo nút phân trang
    let paginationHTML = `
        <button class="prev-page" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    // Tạo các nút số trang
    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 || // Luôn hiển thị trang đầu
            i === totalPages || // Luôn hiển thị trang cuối
            (i >= currentPage - 1 && i <= currentPage + 1) // Hiển thị trang hiện tại và 2 trang xung quanh
        ) {
            paginationHTML += `
                <button class="${i === currentPage ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        } else if (
            (i === currentPage - 2 && currentPage > 3) ||
            (i === currentPage + 2 && currentPage < totalPages - 2)
        ) {
            paginationHTML += `<span class="pagination-dots">...</span>`;
        }
    }

    paginationHTML += `
        <button class="next-page" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    pagination.innerHTML = paginationHTML;

    // Thêm event listeners cho các nút
    pagination.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', function() {
            if (this.classList.contains('prev-page') && currentPage > 1) {
                currentPage--;
            } else if (this.classList.contains('next-page') && currentPage < totalPages) {
                currentPage++;
            } else if (this.dataset.page) {
                currentPage = parseInt(this.dataset.page);
            }
    
            populateTable(filteredChurches);
            setupPagination(filteredChurches);
        });
    });
}

// Thêm vào phần khởi tạo
document.addEventListener('DOMContentLoaded', function() {
    // setupDarkMode(); // Xóa dòng này
    // ... giữ lại các phần khác ...
});

// Thêm vào phần script
function setupMobileTableInteraction() {
    if (window.innerWidth <= 768) {
        const rows = document.querySelectorAll('table tr');
        rows.forEach(row => {
            // Thêm hiệu ứng ripple khi click
            row.addEventListener('click', function(e) {
                const ripple = document.createElement('div');
                ripple.classList.add('ripple');
                this.appendChild(ripple);
                
                const rect = this.getBoundingClientRect();
                ripple.style.left = `${e.clientX - rect.left}px`;
                ripple.style.top = `${e.clientY - rect.top}px`;
                
                setTimeout(() => ripple.remove(), 600);
            });
        });
    }
}

// Gọi function khi trang load và khi resize
document.addEventListener('DOMContentLoaded', setupMobileTableInteraction);
window.addEventListener('resize', setupMobileTableInteraction);

// Thêm function refresh
function refreshFilters() {
    // Reset all filters
    currentFilters = {
        searchTerm: '',
        district: '',
        selectedTimes: [],
        activeDay: 'weekday'
    };
    
    // Reset UI elements
    document.querySelector('.search-input').value = '';
    document.querySelector('.filter-select').value = '';
    document.querySelectorAll('.time-slot input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    currentPage = 1;
    populateTable(churches);
    
    const refreshButton = document.querySelector('.refresh-button');
    refreshButton.classList.add('rotating');
    setTimeout(() => {
        refreshButton.classList.remove('rotating');
    }, 500);
}

// Add event listener for refresh button
document.querySelector('.refresh-button').addEventListener('click', refreshFilters);

// Cập nhật hàm populateTable
function populateTable(filteredChurches = null) {
    // Nếu không có churches được truyền vào, sử dụng toàn bộ danh sách
    if (!filteredChurches) {
        filteredChurches = churches;
    }

    // Áp dụng các filter hiện tại
    if (currentFilters.district) {
        filteredChurches = filteredChurches.filter(church => 
            church.address.toLowerCase().includes(currentFilters.district.toLowerCase())
        );
    }

    if (currentFilters.searchTerm) {
        filteredChurches = filteredChurches.filter(church => 
            church.name.toLowerCase().includes(currentFilters.searchTerm) ||
            church.address.toLowerCase().includes(currentFilters.searchTerm)
        );
    }

    if (currentFilters.selectedTimes.length > 0) {
        filteredChurches = filteredChurches.filter(church => {
            switch(currentFilters.activeDay) {
                case 'weekday':
                    return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].some(day => 
                        church.massTimes[day]?.some(time => currentFilters.selectedTimes.includes(time))
                    );
                case 'saturday':
                    return church.massTimes.saturday?.some(time => currentFilters.selectedTimes.includes(time));
                case 'sunday':
                    return church.massTimes.sunday?.some(time => currentFilters.selectedTimes.includes(time));
                default:
                    return false;
            }
        });
    }

    const tbody = document.querySelector('tbody');
    const isMobile = window.innerWidth <= 768;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedChurches = filteredChurches.slice(startIndex, endIndex);

    tbody.innerHTML = paginatedChurches.map(church => {
        const district = church.address.match(/Q\.\s*(\d+|[^,]+)|Quận\s*(\d+|[^,]+)|Huyện\s*([^,]+)/i)?.[0] || 'Khác';
        
        if (isMobile) {
            const sundayMasses = church.massTimes.sunday?.length || 0;
            const saturdayMasses = church.massTimes.saturday?.length || 0;
            
            return `
                <tr onclick="showChurchDetails(${JSON.stringify(church).replace(/"/g, '&quot;')})">
                    <td>
                        <div class="church-card">
                            <div class="church-header">
                                <div class="church-icon">
                                    <i class="fas fa-church"></i>
                                </div>
                                <div class="church-info">
                                    <div class="church-name">${church.name}</div>
                                    <div class="church-location">
                                        <i class="fas fa-map-marker-alt"></i>
                                        ${district} • ${church.address.split(',')[0]}
                                    </div>
                                </div>
                            </div>
                            <div class="church-footer">
                                <div class="mass-stats">
                                    <div class="mass-badge">
                                        <i class="fas fa-sun"></i>
                                        CN: ${sundayMasses} lễ
                                    </div>
                                    <div class="mass-badge">
                                        <i class="fas fa-star"></i>
                                        T7: ${saturdayMasses} lễ
                                    </div>
                                </div>
                                <div class="view-more">
                                    Chi tiết
                                    <i class="fas fa-chevron-right"></i>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            return `
                <tr onclick="showChurchDetails(${JSON.stringify(church).replace(/"/g, '&quot;')})">
                    <td>${church.name}</td>
                    <td>${district}</td>
                    <td>${church.address}</td>
                    <td>${church.massTimes.sunday.join(', ')}</td>
                    <td>${church.massTimes.saturday.join(', ')}</td>
                </tr>
            `;
        }
    }).join('');

    setupPagination(filteredChurches);
}

// Thêm hàm mới để áp dụng filter
function applyCurrentFilters() {
    let filtered = [...churches];

    if (currentFilters.selectedTimes.length > 0) {
        filtered = filtered.filter(church => {
            switch(currentFilters.activeDay) {
                case 'weekday':
                    return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].some(day => 
                        church.massTimes[day]?.some(time => currentFilters.selectedTimes.includes(time))
                    );
                case 'saturday':
                    return church.massTimes.saturday?.some(time => currentFilters.selectedTimes.includes(time));
                case 'sunday':
                    return church.massTimes.sunday?.some(time => currentFilters.selectedTimes.includes(time));
                default:
                    return false;
            }
        });
    }

    if (currentFilters.searchTerm) {
        filtered = filtered.filter(church => 
            church.name.toLowerCase().includes(currentFilters.searchTerm) ||
            church.address.toLowerCase().includes(currentFilters.searchTerm)
        );
    }

    if (currentFilters.district) {
        filtered = filtered.filter(church => 
            church.address.toLowerCase().includes(currentFilters.district.toLowerCase())
        );
    }

    return filtered;
}

// Cập nhật event listener cho district select
document.querySelector('.filter-select').addEventListener('change', function() {
    currentFilters.district = this.value;
    currentPage = 1; // Reset về trang 1 khi filter thay đổi
    populateTable();
});

// Cập nhật event listener cho search input
document.querySelector('.search-input').addEventListener('input', function() {
    currentFilters.searchTerm = this.value.toLowerCase();
    currentPage = 1; // Reset về trang 1 khi filter thay đổi
    populateTable();
});



        const sidebar = document.querySelector('.sidebar.mobile');
        const closeBtn = document.querySelector('.close-btn');
        const toggleBtn = document.querySelector('.checkbtn'); // Nút mở sidebar
        
        // Sự kiện mở sidebar
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
        });
        
        // Sự kiện đóng sidebar
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
        



